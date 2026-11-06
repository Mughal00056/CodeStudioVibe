import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  ClipboardCopy,
  ClipboardPaste,
  Maximize2,
  Minimize2,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { TerminalService } from '../../services/TerminalService';

interface TerminalWorkspaceProps {
  compactMode?: boolean;
  onCloseDrawer?: () => void;
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
  compactMode = false,
  onCloseDrawer,
}) => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId) || 'default';
  const files = useIDEStore((s) => s.files);
  const terminalSettings = useIDEStore((s) => s.settings.terminal);
  const updateSettings = useIDEStore((s) => s.updateSettings);
  const terminalSessions = useIDEStore((s) => s.terminalSessions);
  const activeTerminalId = useIDEStore((s) => s.activeTerminalId);
  const addTerminalSession = useIDEStore((s) => s.addTerminalSession);
  const removeTerminalSession = useIDEStore((s) => s.removeTerminalSession);
  const setActiveTerminalId = useIDEStore((s) => s.setActiveTerminalId);
  const updateTerminalSession = useIDEStore((s) => s.updateTerminalSession);
  const refreshProjectFromServer = useIDEStore((s) => s.refreshProjectFromServer);
  const createFile = useIDEStore((s) => s.createFile);
  const createFolder = useIDEStore((s) => s.createFolder);
  const deleteEntries = useIDEStore((s) => s.deleteEntries);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [fullscreen, setFullscreen] = useState(false);
  const [quickInput, setQuickInput] = useState('');

  const xtermHostRef = useRef<HTMLDivElement | null>(null);
  const xtermMapRef = useRef<Map<string, { term: XTerm; fit: FitAddon; lineBuffer: string; history: string[]; histIdx: number }>>(
    new Map()
  );

  const activeSession = terminalSessions.find((s) => s.id === activeTerminalId) || null;

  const spawnNewSession = async (shellOverride?: string) => {
    const id = `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const index = terminalSessions.length + 1;
    const chosenShell = shellOverride || terminalSettings.defaultShell;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: terminalSettings.fontSize,
      fontFamily: "'JetBrains Mono', monospace",
      theme: {
        background: theme.terminal.background,
        foreground: theme.terminal.foreground,
        cursor: theme.terminal.cursor,
        black: theme.terminal.black,
        red: theme.terminal.red,
        green: theme.terminal.green,
        yellow: theme.terminal.yellow,
        blue: theme.terminal.blue,
        magenta: theme.terminal.magenta,
        cyan: theme.terminal.cyan,
        white: theme.terminal.white,
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);

    const record = {
      term,
      fit,
      lineBuffer: '',
      history: [] as string[],
      histIdx: -1,
    };
    xtermMapRef.current.set(id, record);

    const writePrompt = (cwdPath: string) => {
      const shortCwd = cwdPath.split('/').slice(-2).join('/') || '~';
      term.write(`\r\n\x1b[36m${shortCwd}\x1b[0m $ `);
    };

    const initInfo = await TerminalService.initSession(id, activeProjectId, chosenShell, {
      onOutput: (chunk) => {
        term.write(chunk);
      },
      onExit: (_code, nextCwd) => {
        const finalCwd = nextCwd || useIDEStore.getState().terminalSessions.find((s) => s.id === id)?.cwd || '~';
        updateTerminalSession(id, { isRunningProcess: false, activeCommand: undefined, cwd: finalCwd });
        writePrompt(finalCwd);
      },
      onCwdChange: (nextCwd) => {
        updateTerminalSession(id, { cwd: nextCwd });
      },
      onFilesChanged: () => {
        refreshProjectFromServer(activeProjectId).catch(() => {});
      },
    });

    addTerminalSession({
      id,
      title: `Shell ${index}`,
      cwd: initInfo.cwd,
      shell: chosenShell,
      isRunningProcess: false,
      runtimeMode: initInfo.runtimeMode,
      createdAt: Date.now(),
    });

    term.writeln(
      `CodeX Studio Terminal (${initInfo.runtimeMode === 'capacitor' ? 'Android Native PTY' : initInfo.runtimeMode === 'server' ? 'Linux Shell Runtime' : 'Offline Workspace Shell'})`
    );
    term.writeln(`Working directory: ${initInfo.cwd}`);
    const shortCwd = initInfo.cwd.split('/').slice(-2).join('/') || '~';
    term.write(`\x1b[36m${shortCwd}\x1b[0m $ `);

    term.onData((data) => {
      const sess = useIDEStore.getState().terminalSessions.find((s) => s.id === id);
      if (!sess) return;

      if (sess.isRunningProcess) {
        if (data === '\x03') {
          TerminalService.sendInput(sess.runtimeMode, id, '\x03');
        } else {
          TerminalService.sendInput(sess.runtimeMode, id, data);
        }
        return;
      }

      if (data === '\r') {
        const cmd = record.lineBuffer;
        term.write('\r\n');
        record.lineBuffer = '';
        if (cmd.trim()) {
          record.history.unshift(cmd);
          record.histIdx = -1;
        }
        if (cmd.trim() === 'clear') {
          term.clear();
          writePrompt(sess.cwd);
          return;
        }
        runCommandOnSession(id, cmd);
      } else if (data === '\x7F') {
        if (record.lineBuffer.length > 0) {
          record.lineBuffer = record.lineBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x1b[A') {
        // Up arrow history
        if (record.histIdx + 1 < record.history.length) {
          record.histIdx++;
          const prevCmd = record.history[record.histIdx];
          while (record.lineBuffer.length > 0) {
            term.write('\b \b');
            record.lineBuffer = record.lineBuffer.slice(0, -1);
          }
          record.lineBuffer = prevCmd;
          term.write(prevCmd);
        }
      } else if (data === '\x1b[B') {
        // Down arrow history
        while (record.lineBuffer.length > 0) {
          term.write('\b \b');
          record.lineBuffer = record.lineBuffer.slice(0, -1);
        }
        if (record.histIdx > 0) {
          record.histIdx--;
          const nextCmd = record.history[record.histIdx];
          record.lineBuffer = nextCmd;
          term.write(nextCmd);
        } else {
          record.histIdx = -1;
          record.lineBuffer = '';
        }
      } else if (data >= ' ') {
        record.lineBuffer += data;
        term.write(data);
      }
    });
  };

  const runCommandOnSession = async (sessionId: string, command: string) => {
    const sess = useIDEStore.getState().terminalSessions.find((s) => s.id === sessionId);
    const rec = xtermMapRef.current.get(sessionId);
    if (!sess || !rec) return;

    updateTerminalSession(sessionId, {
      isRunningProcess: true,
      activeCommand: command.trim(),
    });

    await TerminalService.executeCommand(
      sess.runtimeMode,
      sessionId,
      activeProjectId,
      command,
      rec.term.cols || 80,
      rec.term.rows || 24,
      {
        cwd: sess.cwd,
        files: useIDEStore.getState().files.filter((f) => f.projectId === activeProjectId),
        onWriteFile: (p, content) => {
          const idx = p.lastIndexOf('/');
          createFile(activeProjectId, idx === -1 ? '' : p.slice(0, idx), idx === -1 ? p : p.slice(idx + 1), content);
        },
        onCreateFolder: (p) => {
          const idx = p.lastIndexOf('/');
          createFolder(activeProjectId, idx === -1 ? '' : p.slice(0, idx), idx === -1 ? p : p.slice(idx + 1));
        },
        onDeletePath: (p) => {
          deleteEntries(activeProjectId, [p]);
        },
        callbacks: {
          onOutput: (chunk) => rec.term.write(chunk),
          onExit: (_code, nextCwd) => {
            updateTerminalSession(sessionId, {
              isRunningProcess: false,
              activeCommand: undefined,
              cwd: nextCwd,
            });
            const shortCwd = nextCwd.split('/').slice(-2).join('/') || '~';
            rec.term.write(`\r\n\x1b[36m${shortCwd}\x1b[0m $ `);
          },
          onCwdChange: (nextCwd) => updateTerminalSession(sessionId, { cwd: nextCwd }),
        },
      }
    );
  };

  // Create initial terminal session on first mount if none exists
  useEffect(() => {
    if (terminalSessions.length === 0) {
      spawnNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach active xterm instance to DOM container and resize cleanly
  useEffect(() => {
    const host = xtermHostRef.current;
    if (!host || !activeTerminalId) return;
    const rec = xtermMapRef.current.get(activeTerminalId);
    if (!rec) return;

    host.innerHTML = '';
    rec.term.open(host);
    setTimeout(() => {
      try {
        rec.fit.fit();
      } catch {
        // ignore layout race
      }
    }, 30);

    const observer = new ResizeObserver(() => {
      try {
        rec.fit.fit();
      } catch {
        // ignore
      }
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
    };
  }, [activeTerminalId, fullscreen]);

  // Sync xterm theme colors when IDE theme changes
  useEffect(() => {
    xtermMapRef.current.forEach(({ term }) => {
      term.options.theme = {
        background: theme.terminal.background,
        foreground: theme.terminal.foreground,
        cursor: theme.terminal.cursor,
        black: theme.terminal.black,
        red: theme.terminal.red,
        green: theme.terminal.green,
        yellow: theme.terminal.yellow,
        blue: theme.terminal.blue,
        magenta: theme.terminal.magenta,
        cyan: theme.terminal.cyan,
        white: theme.terminal.white,
      };
      term.options.fontSize = terminalSettings.fontSize;
    });
  }, [theme, terminalSettings.fontSize]);

  const handleCloseSession = (id: string) => {
    TerminalService.closeSession(id);
    const rec = xtermMapRef.current.get(id);
    if (rec) {
      rec.term.dispose();
      xtermMapRef.current.delete(id);
    }
    removeTerminalSession(id);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTerminalId || !activeSession) return;
    const rec = xtermMapRef.current.get(activeTerminalId);
    const cmd = quickInput;
    setQuickInput('');
    if (!rec) return;

    if (activeSession.isRunningProcess) {
      TerminalService.sendInput(activeSession.runtimeMode, activeTerminalId, cmd + '\n');
      return;
    }

    rec.term.writeln(cmd);
    if (cmd.trim() === 'clear') {
      rec.term.clear();
      const shortCwd = activeSession.cwd.split('/').slice(-2).join('/') || '~';
      rec.term.write(`\x1b[36m${shortCwd}\x1b[0m $ `);
      return;
    }
    runCommandOnSession(activeTerminalId, cmd);
  };

  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col'
    : 'flex flex-col h-full w-full overflow-hidden';

  return (
    <div
      className={containerClass}
      style={{
        backgroundColor: theme.terminal.background,
        color: theme.ui.textPrimary,
      }}
    >
      {/* Terminal Top Tab & Action Bar */}
      <div
        className="h-9 px-2 border-b flex items-center justify-between gap-2 shrink-0 select-none"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
        }}
      >
        <div className="flex items-center gap-1 overflow-x-auto h-full">
          {terminalSessions.map((sess) => {
            const active = sess.id === activeTerminalId;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveTerminalId(sess.id)}
                className="h-7 px-2.5 rounded-md flex items-center gap-2 text-xs cursor-pointer shrink-0"
                style={{
                  backgroundColor: active ? theme.ui.bgElevated : 'transparent',
                  color: active ? theme.ui.accent : theme.ui.textSecondary,
                }}
              >
                <span className="font-medium">{sess.title}</span>
                {terminalSessions.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Close ${sess.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseSession(sess.id);
                    }}
                    className="hover:opacity-100 opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => spawnNewSession()}
            title="New Terminal Session"
            aria-label="New Terminal Session"
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-slate-500/10 shrink-0"
            style={{ color: theme.ui.textSecondary }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <select
            aria-label="Select Shell"
            value={terminalSettings.defaultShell}
            onChange={(e) => {
              const shell = e.target.value as '/bin/bash' | '/bin/sh' | '/system/bin/sh';
              updateSettings((s) => ({
                ...s,
                terminal: { ...s.terminal, defaultShell: shell },
              }));
              spawnNewSession(shell);
            }}
            className="hidden sm:block h-7 px-2 rounded border text-[11px] font-mono-code bg-transparent focus:outline-none"
            style={{ borderColor: theme.ui.border, color: theme.ui.textSecondary }}
          >
            <option value="/bin/bash" style={{ backgroundColor: theme.ui.bgSecondary }}>bash</option>
            <option value="/bin/sh" style={{ backgroundColor: theme.ui.bgSecondary }}>sh</option>
            <option value="/system/bin/sh" style={{ backgroundColor: theme.ui.bgSecondary }}>Android sh</option>
          </select>

          {activeSession?.isRunningProcess && (
            <button
              type="button"
              onClick={() =>
                activeTerminalId &&
                TerminalService.killProcess(activeSession.runtimeMode, activeTerminalId)
              }
              title="Terminate Running Process"
              className="h-7 px-2 rounded bg-red-600 text-white text-[11px] font-semibold flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              <span>Stop</span>
            </button>
          )}

          <button
            type="button"
            title="Copy Terminal Selection"
            onClick={async () => {
              const rec = activeTerminalId ? xtermMapRef.current.get(activeTerminalId) : null;
              const sel = rec?.term.getSelection();
              if (sel && navigator.clipboard) {
                await navigator.clipboard.writeText(sel);
                pushToast('info', 'Copied terminal selection');
              }
            }}
            className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-500/10"
            style={{ color: theme.ui.textSecondary }}
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Paste into Terminal"
            onClick={async () => {
              if (!navigator.clipboard || !activeTerminalId || !activeSession) return;
              const text = await navigator.clipboard.readText().catch(() => '');
              const rec = xtermMapRef.current.get(activeTerminalId);
              if (text && rec) {
                rec.lineBuffer += text;
                rec.term.write(text);
              }
            }}
            className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-500/10"
            style={{ color: theme.ui.textSecondary }}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Clear Terminal"
            onClick={() => {
              const rec = activeTerminalId ? xtermMapRef.current.get(activeTerminalId) : null;
              rec?.term.clear();
            }}
            className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-500/10"
            style={{ color: theme.ui.textSecondary }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal'}
            onClick={() => setFullscreen(!fullscreen)}
            className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-500/10"
            style={{ color: theme.ui.textSecondary }}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {compactMode && onCloseDrawer && (
            <button
              type="button"
              title="Hide Terminal Drawer"
              onClick={onCloseDrawer}
              className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-500/10"
              style={{ color: theme.ui.textSecondary }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Working Directory Info Strip */}
      {activeSession && (
        <div
          className="px-3 py-1 text-[11px] font-mono-code border-b flex items-center justify-between gap-2 shrink-0"
          style={{
            backgroundColor: theme.ui.bgPrimary,
            borderColor: theme.ui.border,
            color: theme.ui.textSecondary,
          }}
        >
          <span className="truncate">cwd: {activeSession.cwd}</span>
          <span className="shrink-0">
            {activeSession.runtimeMode === 'capacitor'
              ? 'Android PTY'
              : activeSession.runtimeMode === 'server'
                ? 'Linux Shell'
                : 'Workspace Shell'}
          </span>
        </div>
      )}

      {/* xterm.js Canvas */}
      <div ref={xtermHostRef} className="flex-1 min-h-0 w-full overflow-hidden" />

      {/* Mobile & Touch Command Input Bar */}
      <form
        onSubmit={handleQuickSubmit}
        className="h-10 px-2 border-t flex items-center gap-1.5 shrink-0"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
        }}
      >
        <span className="font-mono-code text-xs font-semibold pl-1" style={{ color: theme.ui.accent }}>
          $
        </span>
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="Run command (e.g. ls, pwd, node index.js, git status)..."
          className="flex-1 h-8 px-2 bg-transparent text-xs font-mono-code focus:outline-none"
          style={{ color: theme.ui.textPrimary }}
        />
        <button
          type="submit"
          className="h-7 px-3 rounded-md text-xs font-semibold shrink-0"
          style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
        >
          Run
        </button>
      </form>
    </div>
  );
};
