import { Capacitor } from '@capacitor/core';
import type { VirtualFile } from '../types';

interface NativeTerminalPlugin {
  createSession(opts: { sessionId: string; cwd: string; shell: string }): Promise<{ cwd: string }>;
  execCommand(opts: { sessionId: string; command: string }): Promise<{ ok: boolean }>;
  sendInput(opts: { sessionId: string; data: string }): Promise<{ ok: boolean }>;
  killProcess(opts: { sessionId: string }): Promise<{ ok: boolean }>;
  addListener(
    eventName: 'terminalOutput',
    cb: (data: { sessionId: string; type: string; data?: string; cwd?: string; code?: number }) => void
  ): Promise<{ remove: () => void }>;
}

function getNativeTerminal(): NativeTerminalPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins;
  return (plugins?.Terminal as NativeTerminalPlugin) || null;
}

export interface TerminalStreamCallbacks {
  onOutput: (chunk: string) => void;
  onExit: (code: number | null, newCwd: string) => void;
  onCwdChange: (newCwd: string) => void;
  onFilesChanged?: () => void;
}

export class TerminalService {
  private static eventSources = new Map<string, EventSource>();
  private static nativeListeners = new Map<string, { remove: () => void }>();

  static async initSession(
    sessionId: string,
    projectId: string,
    shell: string,
    callbacks: TerminalStreamCallbacks
  ): Promise<{ runtimeMode: 'capacitor' | 'server' | 'sandbox'; cwd: string }> {
    const nativeTerm = getNativeTerminal();
    if (nativeTerm) {
      const res = await nativeTerm.createSession({
        sessionId,
        cwd: `/storage/emulated/0/CodeXStudio/${projectId}`,
        shell,
      });
      const listener = await nativeTerm.addListener('terminalOutput', (ev) => {
        if (ev.sessionId !== sessionId) return;
        if (ev.type === 'stdout' || ev.type === 'stderr') {
          callbacks.onOutput(ev.data || '');
        } else if (ev.type === 'exit') {
          callbacks.onExit(ev.code ?? 0, ev.cwd || res.cwd);
        }
      });
      this.nativeListeners.set(sessionId, listener);
      return { runtimeMode: 'capacitor', cwd: res.cwd };
    }

    try {
      const res = await fetch('/api/terminal/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectId, shell }),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; cwd: string };
        this.attachSSE(sessionId, callbacks);
        return { runtimeMode: 'server', cwd: data.cwd };
      }
    } catch {
      // Offline fallback
    }

    return { runtimeMode: 'sandbox', cwd: `/workspace/${projectId}` };
  }

  private static attachSSE(sessionId: string, callbacks: TerminalStreamCallbacks): void {
    const existing = this.eventSources.get(sessionId);
    if (existing) existing.close();

    const es = new EventSource(`/api/terminal/stream/${encodeURIComponent(sessionId)}`);
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type: string;
          data?: string;
          cwd?: string;
          code?: number | null;
        };
        if (msg.type === 'stdout' || msg.type === 'stderr') {
          callbacks.onOutput(msg.data || '');
        } else if (msg.type === 'exit') {
          callbacks.onExit(msg.code ?? 0, msg.cwd || '');
          callbacks.onFilesChanged?.();
        } else if (msg.type === 'ready' && msg.cwd) {
          callbacks.onCwdChange(msg.cwd);
        }
      } catch {
        // ignore malformed chunk
      }
    };
    this.eventSources.set(sessionId, es);
  }

  static async executeCommand(
    runtimeMode: 'capacitor' | 'server' | 'sandbox',
    sessionId: string,
    projectId: string,
    command: string,
    cols: number,
    rows: number,
    sandboxContext?: {
      cwd: string;
      files: VirtualFile[];
      onWriteFile: (path: string, content: string) => void;
      onCreateFolder: (path: string) => void;
      onDeletePath: (path: string) => void;
      callbacks: TerminalStreamCallbacks;
    }
  ): Promise<void> {
    if (runtimeMode === 'capacitor') {
      const nativeTerm = getNativeTerminal();
      await nativeTerm?.execCommand({ sessionId, command });
      return;
    }

    if (runtimeMode === 'server') {
      await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, projectId, command, cols, rows }),
      });
      return;
    }

    // Offline Virtual Shell Fallback when disconnected from backend & native bridge
    if (sandboxContext) {
      this.runOfflineSandboxCommand(command, sandboxContext);
    }
  }

  static async sendInput(
    runtimeMode: 'capacitor' | 'server' | 'sandbox',
    sessionId: string,
    data: string
  ): Promise<void> {
    if (runtimeMode === 'capacitor') {
      await getNativeTerminal()?.sendInput({ sessionId, data });
      return;
    }
    if (runtimeMode === 'server') {
      await fetch('/api/terminal/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, data }),
      }).catch(() => {});
    }
  }

  static async killProcess(
    runtimeMode: 'capacitor' | 'server' | 'sandbox',
    sessionId: string
  ): Promise<void> {
    if (runtimeMode === 'capacitor') {
      await getNativeTerminal()?.killProcess({ sessionId });
      return;
    }
    if (runtimeMode === 'server') {
      await fetch('/api/terminal/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
  }

  static closeSession(sessionId: string): void {
    const es = this.eventSources.get(sessionId);
    if (es) {
      es.close();
      this.eventSources.delete(sessionId);
    }
    const listener = this.nativeListeners.get(sessionId);
    if (listener) {
      listener.remove();
      this.nativeListeners.delete(sessionId);
    }
  }

  private static runOfflineSandboxCommand(
    rawCmd: string,
    ctx: {
      cwd: string;
      files: VirtualFile[];
      onWriteFile: (path: string, content: string) => void;
      onCreateFolder: (path: string) => void;
      onDeletePath: (path: string) => void;
      callbacks: TerminalStreamCallbacks;
    }
  ): void {
    const trimmed = rawCmd.trim();
    if (!trimmed) {
      ctx.callbacks.onExit(0, ctx.cwd);
      return;
    }

    const tokens = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd = tokens[0];
    const args = tokens.slice(1).map((a) => a.replace(/^["']|["']$/g, ''));
    const rootPrefix = ctx.cwd.split('/').slice(0, 3).join('/');
    const relCwd = ctx.cwd.startsWith(rootPrefix + '/')
      ? ctx.cwd.slice(rootPrefix.length + 1)
      : '';

    const resolveRel = (p: string): string => {
      if (!p || p === '.') return relCwd;
      if (p === '..') {
        const idx = relCwd.lastIndexOf('/');
        return idx === -1 ? '' : relCwd.slice(0, idx);
      }
      return relCwd ? `${relCwd}/${p.replace(/^\/+/, '')}` : p.replace(/^\/+/, '');
    };

    switch (cmd) {
      case 'pwd': {
        ctx.callbacks.onOutput(`${ctx.cwd}\r\n`);
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'ls': {
        const targetRel = args[0] ? resolveRel(args[0]) : relCwd;
        const children = ctx.files
          .filter((f) => f.parentPath === targetRel)
          .map((f) => (f.type === 'folder' ? `${f.name}/` : f.name))
          .sort();
        ctx.callbacks.onOutput(children.length ? `${children.join('  ')}\r\n` : '');
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'cd': {
        const nextRel = resolveRel(args[0] || '');
        const exists =
          nextRel === '' ||
          ctx.files.some((f) => f.type === 'folder' && f.path === nextRel);
        if (exists) {
          const nextCwd = nextRel ? `${rootPrefix}/${nextRel}` : rootPrefix;
          ctx.callbacks.onExit(0, nextCwd);
        } else {
          ctx.callbacks.onOutput(`sh: cd: ${args[0]}: No such directory\r\n`);
          ctx.callbacks.onExit(1, ctx.cwd);
        }
        break;
      }
      case 'mkdir': {
        if (!args[0]) {
          ctx.callbacks.onOutput('mkdir: missing operand\r\n');
          ctx.callbacks.onExit(1, ctx.cwd);
        } else {
          ctx.onCreateFolder(resolveRel(args[0]));
          ctx.callbacks.onExit(0, ctx.cwd);
        }
        break;
      }
      case 'touch': {
        if (!args[0]) {
          ctx.callbacks.onOutput('touch: missing file operand\r\n');
          ctx.callbacks.onExit(1, ctx.cwd);
        } else {
          const target = resolveRel(args[0]);
          const existing = ctx.files.find((f) => f.path === target);
          ctx.onWriteFile(target, existing ? existing.content : '');
          ctx.callbacks.onExit(0, ctx.cwd);
        }
        break;
      }
      case 'cat': {
        const target = resolveRel(args[0] || '');
        const file = ctx.files.find((f) => f.path === target && f.type === 'file');
        if (!file) {
          ctx.callbacks.onOutput(`cat: ${args[0] || ''}: No such file\r\n`);
          ctx.callbacks.onExit(1, ctx.cwd);
        } else {
          ctx.callbacks.onOutput(file.content.replace(/\r?\n/g, '\r\n') + '\r\n');
          ctx.callbacks.onExit(0, ctx.cwd);
        }
        break;
      }
      case 'echo': {
        const gtIdx = args.indexOf('>');
        if (gtIdx !== -1 && args[gtIdx + 1]) {
          const text = args.slice(0, gtIdx).join(' ');
          ctx.onWriteFile(resolveRel(args[gtIdx + 1]), text + '\n');
        } else {
          ctx.callbacks.onOutput(args.join(' ') + '\r\n');
        }
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'grep': {
        const pattern = args[0] || '';
        const target = args[1] ? resolveRel(args[1]) : null;
        const candidates = ctx.files.filter(
          (f) => f.type === 'file' && (!target || f.path === target)
        );
        for (const f of candidates) {
          const lines = f.content.split('\n');
          lines.forEach((ln, idx) => {
            if (ln.includes(pattern)) {
              ctx.callbacks.onOutput(`${f.path}:${idx + 1}:${ln}\r\n`);
            }
          });
        }
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'find': {
        const list = ctx.files.map((f) => `./${f.path}`).sort();
        ctx.callbacks.onOutput(list.join('\r\n') + '\r\n');
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'rm': {
        const target = resolveRel(args[args.length - 1] || '');
        if (target) ctx.onDeletePath(target);
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'uname': {
        ctx.callbacks.onOutput('Linux Android aarch64 CodeX-Shell\r\n');
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      case 'help': {
        ctx.callbacks.onOutput(
          'Offline workspace shell active (Android Termux / Server shell unavailable).\r\n' +
            'Available commands: pwd, ls, cd, mkdir, touch, cat, echo, grep, find, rm, uname, clear\r\n'
        );
        ctx.callbacks.onExit(0, ctx.cwd);
        break;
      }
      default: {
        ctx.callbacks.onOutput(
          `sh: ${cmd}: command requires native Android Termux or connected Node shell runtime\r\n`
        );
        ctx.callbacks.onExit(127, ctx.cwd);
      }
    }
  }
}
