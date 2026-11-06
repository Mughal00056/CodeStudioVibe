import type { Project, ProjectTemplateId, VirtualFile } from '../types';
import { getBaseName, getParentPath } from './languageUtils';

export interface ProjectTemplateSpec {
  id: ProjectTemplateId;
  name: string;
  category: 'Web' | 'App' | 'Backend' | 'Starter';
  description: string;
  files: Record<string, string>;
}

export const PROJECT_TEMPLATES: ProjectTemplateSpec[] = [
  {
    id: 'html',
    name: 'HTML5 Web App',
    category: 'Web',
    description: 'Responsive HTML5, modern CSS layout, and modular JavaScript entry point with live preview.',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pulse Task Tracker</title>
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <h1>Pulse Sprint Board</h1>
        <p class="subtitle">Mobile-first responsive web application</p>
      </div>
      <button id="addTaskBtn" class="btn-primary">+ New Task</button>
    </header>

    <section class="stats-row">
      <div class="stat-item">
        <span class="stat-label">Total Tasks</span>
        <strong id="totalCount" class="stat-value">0</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">Completed</span>
        <strong id="doneCount" class="stat-value">0</strong>
      </div>
    </section>

    <ul id="taskList" class="task-list"></ul>
  </main>

  <script src="scripts/app.js"></script>
</body>
</html>
`,
      'styles/main.css': `:root {
  --bg: #0f172a;
  --surface: #1e293b;
  --border: #334155;
  --text: #f8fafc;
  --muted: #94a3b8;
  --accent: #3b82f6;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  padding: 20px;
  line-height: 1.5;
}

.shell {
  max-width: 680px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.topbar h1 {
  font-size: 1.35rem;
  font-weight: 700;
}

.subtitle {
  color: var(--muted);
  font-size: 0.85rem;
}

.btn-primary {
  background: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 18px 0;
}

.stat-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
}

.stat-label {
  display: block;
  font-size: 0.78rem;
  color: var(--muted);
}

.stat-value {
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
}

.task-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
}

.task-row.done span {
  text-decoration: line-through;
  color: var(--muted);
}
`,
      'scripts/app.js': `const initialTasks = [
  { id: 1, title: 'Configure Android Storage Access Framework', done: true },
  { id: 2, title: 'Implement CodeMirror 6 syntax highlighting', done: true },
  { id: 3, title: 'Test responsive mobile viewport preview', done: false },
];

let tasks = [...initialTasks];

function render() {
  const listEl = document.getElementById('taskList');
  const totalEl = document.getElementById('totalCount');
  const doneEl = document.getElementById('doneCount');

  totalEl.textContent = String(tasks.length);
  doneEl.textContent = String(tasks.filter((t) => t.done).length);

  listEl.innerHTML = '';
  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-row' + (task.done ? ' done' : '');

    const label = document.createElement('span');
    label.textContent = task.title;

    const toggle = document.createElement('button');
    toggle.className = 'btn-primary';
    toggle.style.padding = '6px 12px';
    toggle.textContent = task.done ? 'Reopen' : 'Complete';
    toggle.onclick = () => {
      task.done = !task.done;
      render();
    };

    li.appendChild(label);
    li.appendChild(toggle);
    listEl.appendChild(li);
  });
}

document.getElementById('addTaskBtn').addEventListener('click', () => {
  const nextIndex = tasks.length + 1;
  tasks.unshift({
    id: Date.now(),
    title: 'Sprint deliverable #' + nextIndex,
    done: false,
  });
  console.log('Added task #' + nextIndex);
  render();
});

render();
`,
      'README.md': `# Pulse Sprint Board\n\nEdit \`index.html\`, \`styles/main.css\`, or \`scripts/app.js\` and open **Live Preview** to see instant updates.\n`,
    },
  },
  {
    id: 'css',
    name: 'CSS Design System',
    category: 'Web',
    description: 'CSS Grid, custom properties, and responsive component showcase.',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CSS Token System</title>
  <link rel="stylesheet" href="tokens.css" />
  <link rel="stylesheet" href="layout.css" />
</head>
<body>
  <div class="container">
    <h1>Typography &amp; Surface Scale</h1>
    <p>Edit CSS custom properties in <code>tokens.css</code> to preview live updates.</p>
    <div class="grid">
      <article class="card">
        <h2>Surface Level 1</h2>
        <p>Subtle hairline border with balanced spacing.</p>
      </article>
      <article class="card">
        <h2>Interactive Control</h2>
        <button class="action">Primary Action</button>
      </article>
    </div>
  </div>
</body>
</html>
`,
      'tokens.css': `:root {
  --surface-canvas: #0b0e14;
  --surface-card: #141923;
  --border-hairline: #232b3a;
  --ink-primary: #f1f5f9;
  --ink-muted: #94a3b8;
  --brand-accent: #3b82f6;
  --radius-md: 10px;
}
`,
      'layout.css': `body {
  margin: 0;
  padding: 24px;
  font-family: system-ui, sans-serif;
  background: var(--surface-canvas);
  color: var(--ink-primary);
}

.container {
  max-width: 720px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.card {
  background: var(--surface-card);
  border: 1px solid var(--border-hairline);
  border-radius: var(--radius-md);
  padding: 18px;
}

.action {
  margin-top: 12px;
  background: var(--brand-accent);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
}
`,
    },
  },
  {
    id: 'javascript',
    name: 'JavaScript ES6+ Module',
    category: 'Web',
    description: 'Modern ES module project with interactive DOM playground and CLI runner.',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JS Benchmark &amp; Data Pipeline</title>
</head>
<body style="font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 24px;">
  <h1>JavaScript Data Pipeline</h1>
  <pre id="output" style="background: #1e293b; padding: 16px; border-radius: 8px; margin-top: 16px;"></pre>
  <script src="main.js"></script>
</body>
</html>
`,
      'main.js': `function summarizeMetrics(records) {
  const total = records.reduce((acc, r) => acc + r.latencyMs, 0);
  const avg = records.length ? (total / records.length).toFixed(2) : '0.00';
  return {
    count: records.length,
    averageLatencyMs: Number(avg),
    maxLatencyMs: Math.max(...records.map((r) => r.latencyMs)),
  };
}

const sample = [
  { endpoint: '/api/files', latencyMs: 14 },
  { endpoint: '/api/terminal', latencyMs: 28 },
  { endpoint: '/api/git', latencyMs: 19 },
];

const summary = summarizeMetrics(sample);
console.log('Pipeline Summary:', JSON.stringify(summary));

if (typeof document !== 'undefined') {
  const el = document.getElementById('output');
  if (el) el.textContent = JSON.stringify(summary, null, 2);
}
`,
    },
  },
  {
    id: 'react',
    name: 'React + JSX Component App',
    category: 'App',
    description: 'Component-driven React starter with JSX views and state hooks.',
    files: {
      'package.json': `{
  "name": "codex-react-starter",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
`,
      'src/App.jsx': `import React, { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app-shell">
      <h1>React Mobile Workspace</h1>
      <p>Counter value: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Increment Counter
      </button>
    </main>
  );
}

export default App;
`,
      'src/index.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0b0e14;
  color: #e6edf3;
}
`,
    },
  },
  {
    id: 'typescript',
    name: 'TypeScript Strict Library',
    category: 'App',
    description: 'Strongly typed TypeScript project with tsconfig.json and modular services.',
    files: {
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "moduleResolution": "bundler"
  }
}
`,
      'src/index.ts': `export interface BuildArtifact {
  id: string;
  targetAbi: 'arm64-v8a' | 'armeabi-v7a' | 'x86_64';
  minSdk: number;
  sizeBytes: number;
}

export function formatArtifactSummary(artifact: BuildArtifact): string {
  const mb = (artifact.sizeBytes / (1024 * 1024)).toFixed(2);
  return \`\${artifact.id} (\${artifact.targetAbi}, API \${artifact.minSdk}+) - \${mb} MB\`;
}

const releaseBuild: BuildArtifact = {
  id: 'codex-studio-release.aab',
  targetAbi: 'arm64-v8a',
  minSdk: 28,
  sizeBytes: 14_820_000,
};

console.log(formatArtifactSummary(releaseBuild));
`,
    },
  },
  {
    id: 'nodejs',
    name: 'Node.js CLI & HTTP Service',
    category: 'Backend',
    description: 'Runnable Node.js project ready for direct execution in the Integrated Terminal.',
    files: {
      'package.json': `{
  "name": "codex-node-service",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
`,
      'index.js': `import os from 'node:os';

const info = {
  service: 'codex-node-worker',
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus().length,
  uptimeSec: Math.round(process.uptime()),
};

console.log('Node.js Runtime Diagnostic:');
console.log(JSON.stringify(info, null, 2));
`,
    },
  },
  {
    id: 'php',
    name: 'PHP Web & API Script',
    category: 'Backend',
    description: 'Structured PHP 8 script with JSON response helper and routing.',
    files: {
      'index.php': `<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$payload = [
    'app' => 'CodeX PHP Endpoint',
    'php_version' => PHP_VERSION,
    'timestamp' => time(),
];

echo json_encode($payload, JSON_PRETTY_PRINT);
`,
    },
  },
  {
    id: 'custom',
    name: 'Android Kotlin + Gradle Module',
    category: 'App',
    description: 'Android Gradle & Kotlin starter with MainActivity and build.gradle.',
    files: {
      'build.gradle': `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.example.mobileapp'
    compileSdk 34

    defaultConfig {
        applicationId "com.example.mobileapp"
        minSdk 28
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
}
`,
      'src/MainActivity.kt': `package com.example.mobileapp

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }
}
`,
    },
  },
  {
    id: 'empty',
    name: 'Empty Workspace',
    category: 'Starter',
    description: 'Clean directory ready for custom files and folders.',
    files: {
      'README.md': `# New Project\n\nCreated with CodeX Studio.\n`,
    },
  },
];

export function instantiateProjectFromTemplate(
  name: string,
  templateId: ProjectTemplateId,
  storageType: 'internal' | 'saf' | 'github' = 'internal',
  customFiles?: Record<string, string>
): { project: Project; files: VirtualFile[] } {
  const now = Date.now();
  const projectId = `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const spec = PROJECT_TEMPLATES.find((t) => t.id === templateId) || PROJECT_TEMPLATES[0];
  const fileMap = customFiles || spec.files;

  const project: Project = {
    id: projectId,
    name: name.trim() || 'Untitled Project',
    template: templateId,
    rootPath: `/storage/emulated/0/CodeXStudio/${name.trim().replace(/\s+/g, '_')}`,
    storageType,
    createdAt: now,
    updatedAt: now,
    gitInitialized: true,
  };

  const folderSet = new Set<string>();
  const files: VirtualFile[] = [];

  for (const [rawPath, content] of Object.entries(fileMap)) {
    const cleanPath = rawPath.replace(/^\/+/, '');
    const parts = cleanPath.split('/');
    for (let i = 1; i < parts.length; i++) {
      folderSet.add(parts.slice(0, i).join('/'));
    }

    files.push({
      id: `file_${projectId}_${cleanPath}`,
      projectId,
      path: cleanPath,
      name: getBaseName(cleanPath),
      parentPath: getParentPath(cleanPath),
      type: 'file',
      content,
      size: new TextEncoder().encode(content).length,
      lastModified: now,
      isHidden: getBaseName(cleanPath).startsWith('.'),
    });
  }

  for (const folderPath of Array.from(folderSet).sort()) {
    files.push({
      id: `folder_${projectId}_${folderPath}`,
      projectId,
      path: folderPath,
      name: getBaseName(folderPath),
      parentPath: getParentPath(folderPath),
      type: 'folder',
      content: '',
      size: 0,
      lastModified: now,
      isHidden: getBaseName(folderPath).startsWith('.'),
    });
  }

  return { project, files };
}
