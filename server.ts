import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 3000);
const WORKSPACE_ROOT = process.env.CODEX_WORKSPACE_ROOT || '/tmp/codex-studio-workspaces';

fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });

interface ServerTerminalSession {
  id: string;
  projectId: string;
  cwd: string;
  shell: string;
  activeProcess: ChildProcess | null;
  activeCommand: string | null;
  emitter: EventEmitter;
  historyBuffer: string[];
}

const terminalSessions = new Map<string, ServerTerminalSession>();

function sanitizeProjectId(rawId: string): string {
  const cleaned = String(rawId || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'default';
}

function getProjectRoot(projectId: string): string {
  const safeId = sanitizeProjectId(projectId);
  const full = path.resolve(WORKSPACE_ROOT, safeId);
  fs.mkdirSync(full, { recursive: true });
  return full;
}

function resolveSafePath(projectRoot: string, relativePath: string): string {
  const normalizedRel = relativePath.replace(/^\/+/, '');
  const resolved = path.resolve(projectRoot, normalizedRel);
  if (resolved !== projectRoot && !resolved.startsWith(projectRoot + path.sep)) {
    throw new Error('Path traversal rejected');
  }
  return resolved;
}

function collectDiskFiles(
  projectRoot: string,
  currentDir: string,
  results: Array<{ path: string; type: 'file' | 'folder'; content: string; size: number; lastModified: number }>
): void {
  if (!fs.existsSync(currentDir)) return;
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(projectRoot, fullPath).split(path.sep).join('/');
    const stats = fs.statSync(fullPath);

    if (entry.isDirectory()) {
      results.push({
        path: relPath,
        type: 'folder',
        content: '',
        size: 0,
        lastModified: stats.mtimeMs,
      });
      collectDiskFiles(projectRoot, fullPath, results);
    } else if (entry.isFile()) {
      // Skip oversized binary files (> 1.5 MB) to protect low-RAM budget
      const isBinary = /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|zip|tar|gz|pdf|apk|aab|jar|so)$/i.test(entry.name);
      const content =
        isBinary || stats.size > 1_500_000
          ? ''
          : fs.readFileSync(fullPath, 'utf8');
      results.push({
        path: relPath,
        type: 'file',
        content,
        size: stats.size,
        lastModified: stats.mtimeMs,
      });
    }
  }
}

async function probeBinary(
  binaryName: string,
  versionArgs: string[]
): Promise<{ installed: boolean; version: string | null; binaryPath: string | null }> {
  try {
    const { stdout: whichOut } = await execFileAsync('which', [binaryName], { timeout: 2500 });
    const binaryPath = whichOut.trim().split('\n')[0] || null;
    if (!binaryPath) {
      return { installed: false, version: null, binaryPath: null };
    }
    try {
      const { stdout, stderr } = await execFileAsync(binaryName, versionArgs, { timeout: 2500 });
      const raw = (stdout || stderr || '').trim().split('\n')[0] || 'Installed';
      return { installed: true, version: raw, binaryPath };
    } catch {
      return { installed: true, version: 'Installed', binaryPath };
    }
  } catch {
    return { installed: false, version: null, binaryPath: null };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      runtime: 'node-express',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });
  });

  // Sync IndexedDB project files to sandboxed disk workspace
  app.post('/api/workspace/sync', (req, res) => {
    try {
      const { projectId, files, cleanRemoved } = req.body as {
        projectId: string;
        files: Array<{ path: string; type: 'file' | 'folder'; content: string }>;
        cleanRemoved?: boolean;
      };
      const projectRoot = getProjectRoot(projectId);

      if (cleanRemoved) {
        const existing = fs.readdirSync(projectRoot);
        for (const item of existing) {
          if (item === '.git' || item === 'node_modules') continue;
          fs.rmSync(path.join(projectRoot, item), { recursive: true, force: true });
        }
      }

      for (const item of files || []) {
        if (!item.path || item.path.startsWith('.git/')) continue;
        const target = resolveSafePath(projectRoot, item.path);
        if (item.type === 'folder') {
          fs.mkdirSync(target, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, item.content ?? '', 'utf8');
        }
      }

      res.json({ ok: true, workspacePath: projectRoot });
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'Sync failed' });
    }
  });

  // Read disk workspace files back into IDE
  app.get('/api/workspace/files', (req, res) => {
    try {
      const projectId = String(req.query.projectId || 'default');
      const projectRoot = getProjectRoot(projectId);
      const files: Array<{
        path: string;
        type: 'file' | 'folder';
        content: string;
        size: number;
        lastModified: number;
      }> = [];
      collectDiskFiles(projectRoot, projectRoot, files);
      res.json({ ok: true, workspacePath: projectRoot, files });
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'Read failed' });
    }
  });

  // Create or get terminal session
  app.post('/api/terminal/session', (req, res) => {
    const { sessionId, projectId, shell } = req.body as {
      sessionId: string;
      projectId: string;
      shell?: string;
    };
    const projectRoot = getProjectRoot(projectId);
    const chosenShell = shell && fs.existsSync(shell) ? shell : fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';

    let session = terminalSessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        projectId: sanitizeProjectId(projectId),
        cwd: projectRoot,
        shell: chosenShell,
        activeProcess: null,
        activeCommand: null,
        emitter: new EventEmitter(),
        historyBuffer: [],
      };
      terminalSessions.set(sessionId, session);
    } else {
      session.projectId = sanitizeProjectId(projectId);
      if (!fs.existsSync(session.cwd)) {
        session.cwd = projectRoot;
      }
    }

    res.json({
      ok: true,
      sessionId: session.id,
      cwd: session.cwd,
      shell: session.shell,
      workspaceRoot: projectRoot,
    });
  });

  // SSE stream for real-time terminal output
  app.get('/api/terminal/stream/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = terminalSessions.get(sessionId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!session) {
      res.write(`data: ${JSON.stringify({ type: 'ready', cwd: WORKSPACE_ROOT })}\n\n`);
      return;
    }

    const onOutput = (payload: { type: string; data?: string; cwd?: string; code?: number | null }) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    session.emitter.on('event', onOutput);
    res.write(`data: ${JSON.stringify({ type: 'ready', cwd: session.cwd })}\n\n`);

    req.on('close', () => {
      session.emitter.off('event', onOutput);
    });
  });

  // Execute command in terminal session
  app.post('/api/terminal/exec', (req, res) => {
    const { sessionId, projectId, command, cols, rows } = req.body as {
      sessionId: string;
      projectId: string;
      command: string;
      cols?: number;
      rows?: number;
    };

    const projectRoot = getProjectRoot(projectId);
    let session = terminalSessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        projectId: sanitizeProjectId(projectId),
        cwd: projectRoot,
        shell: fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh',
        activeProcess: null,
        activeCommand: null,
        emitter: new EventEmitter(),
        historyBuffer: [],
      };
      terminalSessions.set(sessionId, session);
    }

    const trimmed = (command || '').trim();
    if (!trimmed) {
      res.json({ ok: true, cwd: session.cwd, exitCode: 0 });
      return;
    }

    // Handle built-in cd so cwd persists across commands inside the sandbox
    if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
      const targetArg = trimmed === 'cd' ? '' : trimmed.slice(3).trim().replace(/^["']|["']$/g, '');
      const nextDir = targetArg ? path.resolve(session.cwd, targetArg) : projectRoot;
      if (
        (nextDir === projectRoot || nextDir.startsWith(projectRoot + path.sep)) &&
        fs.existsSync(nextDir) &&
        fs.statSync(nextDir).isDirectory()
      ) {
        session.cwd = nextDir;
        session.emitter.emit('event', { type: 'exit', code: 0, cwd: session.cwd });
        res.json({ ok: true, cwd: session.cwd, exitCode: 0 });
      } else {
        const msg = `bash: cd: ${targetArg || '~'}: No such directory within workspace\r\n`;
        session.emitter.emit('event', { type: 'stderr', data: msg });
        session.emitter.emit('event', { type: 'exit', code: 1, cwd: session.cwd });
        res.json({ ok: true, cwd: session.cwd, exitCode: 1, stderr: msg });
      }
      return;
    }

    if (session.activeProcess) {
      try {
        session.activeProcess.stdin?.write(command + '\n');
        res.json({ ok: true, cwd: session.cwd, forwardedToStdin: true });
        return;
      } catch {
        // Fallback if process closed
      }
    }

    const env = {
      ...process.env,
      HOME: projectRoot,
      PWD: session.cwd,
      TERM: 'xterm-256color',
      COLUMNS: String(cols || 80),
      LINES: String(rows || 24),
      FORCE_COLOR: '1',
    };

    const child = spawn(session.shell, ['-c', trimmed], {
      cwd: session.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    session.activeProcess = child;
    session.activeCommand = trimmed;
    session.emitter.emit('event', { type: 'started', command: trimmed });

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').replace(/\r?\n/g, '\r\n');
      session?.emitter.emit('event', { type: 'stdout', data: text });
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').replace(/\r?\n/g, '\r\n');
      session?.emitter.emit('event', { type: 'stderr', data: text });
    });

    child.on('close', (code) => {
      if (session) {
        session.activeProcess = null;
        session.activeCommand = null;
        session.emitter.emit('event', { type: 'exit', code: code ?? 0, cwd: session.cwd });
      }
    });

    child.on('error', (err) => {
      if (session) {
        session.activeProcess = null;
        session.activeCommand = null;
        session.emitter.emit('event', { type: 'stderr', data: `${err.message}\r\n` });
        session.emitter.emit('event', { type: 'exit', code: 1, cwd: session.cwd });
      }
    });

    res.json({ ok: true, cwd: session.cwd, pid: child.pid });
  });

  // Send raw stdin or Ctrl+C to running process
  app.post('/api/terminal/input', (req, res) => {
    const { sessionId, data } = req.body as { sessionId: string; data: string };
    const session = terminalSessions.get(sessionId);
    if (!session || !session.activeProcess) {
      res.json({ ok: false });
      return;
    }
    if (data === '\x03') {
      session.activeProcess.kill('SIGINT');
      session.emitter.emit('event', { type: 'stdout', data: '^C\r\n' });
    } else {
      session.activeProcess.stdin?.write(data);
    }
    res.json({ ok: true });
  });

  // Terminate active process in session
  app.post('/api/terminal/kill', (req, res) => {
    const { sessionId } = req.body as { sessionId: string };
    const session = terminalSessions.get(sessionId);
    if (session?.activeProcess) {
      session.activeProcess.kill('SIGKILL');
      session.activeProcess = null;
      session.activeCommand = null;
      session.emitter.emit('event', { type: 'stderr', data: '\r\n[Process terminated]\r\n' });
      session.emitter.emit('event', { type: 'exit', code: 137, cwd: session.cwd });
    }
    res.json({ ok: true });
  });

  // Probe real installed toolchains
  app.get('/api/toolchains', async (_req, res) => {
    const specs = [
      {
        id: 'nodejs',
        name: 'Node.js & npm',
        binaryName: 'node',
        args: ['-v'],
        termuxPackage: 'pkg install nodejs-lts',
        installNotes: 'JavaScript & TypeScript runtime + npm package manager',
      },
      {
        id: 'python',
        name: 'Python 3',
        binaryName: 'python3',
        args: ['--version'],
        termuxPackage: 'pkg install python',
        installNotes: 'Python 3 interpreter and pip standard library',
      },
      {
        id: 'java',
        name: 'Java (OpenJDK)',
        binaryName: 'javac',
        args: ['-version'],
        termuxPackage: 'pkg install openjdk-17',
        installNotes: 'Java compiler (javac) and JVM runtime',
      },
      {
        id: 'kotlin',
        name: 'Kotlin Compiler',
        binaryName: 'kotlinc',
        args: ['-version'],
        termuxPackage: 'pkg install kotlin',
        installNotes: 'Kotlin/JVM command-line compiler',
      },
      {
        id: 'c',
        name: 'C Compiler (GCC / Clang)',
        binaryName: 'gcc',
        args: ['--version'],
        termuxPackage: 'pkg install clang',
        installNotes: 'ISO C compiler and linker for ARM64',
      },
      {
        id: 'cpp',
        name: 'C++ Compiler (G++ / Clang++)',
        binaryName: 'g++',
        args: ['--version'],
        termuxPackage: 'pkg install clang',
        installNotes: 'C++17/C++20 compiler and STL',
      },
      {
        id: 'php',
        name: 'PHP CLI',
        binaryName: 'php',
        args: ['-v'],
        termuxPackage: 'pkg install php',
        installNotes: 'PHP CLI interpreter and built-in dev server',
      },
      {
        id: 'rust',
        name: 'Rust (rustc & cargo)',
        binaryName: 'rustc',
        args: ['--version'],
        termuxPackage: 'pkg install rust',
        installNotes: 'Rust compiler and Cargo build system',
      },
      {
        id: 'go',
        name: 'Go Toolchain',
        binaryName: 'go',
        args: ['version'],
        termuxPackage: 'pkg install golang',
        installNotes: 'Go compiler and module toolchain',
      },
    ];

    const results = await Promise.all(
      specs.map(async (spec) => {
        const probe = await probeBinary(spec.binaryName, spec.args);
        return {
          id: spec.id,
          name: spec.name,
          binaryName: spec.binaryName,
          installed: probe.installed,
          version: probe.version,
          binaryPath: probe.binaryPath,
          architecture: `${process.platform}-${process.arch}`,
          termuxPackage: spec.termuxPackage,
          installNotes: spec.installNotes,
        };
      })
    );

    res.json({ ok: true, toolchains: results });
  });

  // Real Git command runner inside sandboxed project workspace
  app.post('/api/git/exec', async (req, res) => {
    try {
      const { projectId, args } = req.body as { projectId: string; args: string[] };
      const projectRoot = getProjectRoot(projectId);
      const allowedSubcommands = new Set([
        'init',
        'status',
        'add',
        'commit',
        'branch',
        'checkout',
        'switch',
        'diff',
        'log',
        'merge',
        'config',
        'remote',
        'rev-parse',
      ]);

      if (!Array.isArray(args) || args.length === 0 || !allowedSubcommands.has(args[0])) {
        res.status(400).json({ ok: false, error: 'Unsupported git operation' });
        return;
      }

      // Ensure git user identity is configured locally in sandbox if committing
      if (args[0] === 'commit') {
        await execFileAsync('git', ['config', 'user.name', 'CodeX Developer'], { cwd: projectRoot }).catch(() => {});
        await execFileAsync('git', ['config', 'user.email', 'developer@codexstudio.local'], { cwd: projectRoot }).catch(() => {});
      }

      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: projectRoot,
        timeout: 8000,
      });
      res.json({ ok: true, stdout, stderr });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      res.json({
        ok: false,
        stdout: e.stdout || '',
        stderr: e.stderr || e.message || 'Git error',
      });
    }
  });

  // GitHub public repository search & user repo lookup
  app.get('/api/github/search', async (req, res) => {
    try {
      const q = String(req.query.q || 'codex').trim();
      const authHeader = req.headers.authorization;
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CodeX-Studio-IDE',
      };
      if (authHeader) {
        headers.Authorization = authHeader;
      }

      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=12&sort=stars`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        res.status(response.status).json({ ok: false, error: `GitHub API returned ${response.status}` });
        return;
      }
      const data = (await response.json()) as {
        items?: Array<{
          id: number;
          name: string;
          full_name: string;
          description: string | null;
          private: boolean;
          html_url: string;
          clone_url: string;
          language: string | null;
          stargazers_count: number;
          default_branch: string;
          updated_at: string;
        }>;
      };
      const repos = (data.items || []).map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description || '',
        private: r.private,
        htmlUrl: r.html_url,
        cloneUrl: r.clone_url,
        language: r.language || 'Code',
        stargazersCount: r.stargazers_count,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
      }));
      res.json({ ok: true, repos });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to reach GitHub API',
      });
    }
  });

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CodeX Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CodeX Studio server:', err);
  process.exit(1);
});
