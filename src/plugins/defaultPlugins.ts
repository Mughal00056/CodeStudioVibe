import type { PluginDefinition, PluginState } from '../types';

export const DEFAULT_PLUGINS: PluginDefinition[] = [
  {
    id: 'plugin-prettier',
    name: 'Prettier Code Formatter',
    version: '3.2.5',
    author: 'CodeX Core',
    description: 'Opinionated code formatter for HTML, CSS, JavaScript, TypeScript, JSX, TSX, JSON, Markdown, and YAML.',
    category: 'Formatter',
    isDefault: true,
    permissions: ['editor:read', 'editor:write', 'command:register', 'toolbar:register'],
    commands: [{ id: 'prettier.format', label: 'Prettier: Format Document', shortcut: 'Shift+Alt+F' }],
    toolbarAction: { id: 'prettier.format', label: 'Format', iconName: 'Wand2' },
  },
  {
    id: 'plugin-emmet',
    name: 'Emmet Abbreviation Expander',
    version: '2.4.1',
    author: 'CodeX Core',
    description: 'Expand HTML & CSS shorthand abbreviations such as ul>li*3 or section.card>h2+p directly in the editor.',
    category: 'Productivity',
    isDefault: true,
    permissions: ['editor:read', 'editor:write', 'command:register'],
    commands: [{ id: 'emmet.expand', label: 'Emmet: Expand Abbreviation', shortcut: 'Ctrl+E' }],
  },
  {
    id: 'plugin-eslint',
    name: 'ESLint Static Analyzer',
    version: '9.1.0',
    author: 'CodeX Core',
    description: 'Detects common JavaScript and TypeScript issues including var usage, debugger statements, and empty blocks.',
    category: 'Linter',
    isDefault: true,
    permissions: ['editor:read', 'command:register'],
    commands: [{ id: 'eslint.analyze', label: 'ESLint: Run Diagnostics on Active File' }],
  },
  {
    id: 'plugin-markdown-tools',
    name: 'Markdown Tools & TOC',
    version: '1.8.0',
    author: 'CodeX Core',
    description: 'Generates Table of Contents, structured Markdown tables, and clean heading hierarchies.',
    category: 'Markdown',
    isDefault: true,
    permissions: ['editor:read', 'editor:write', 'command:register'],
    commands: [{ id: 'markdown.toc', label: 'Markdown: Insert Table of Contents' }],
  },
  {
    id: 'plugin-color-picker',
    name: 'Color Picker & Converter',
    version: '1.4.2',
    author: 'CodeX Core',
    description: 'Pick hex colors and insert CSS variables or RGB/HSL color values at the cursor.',
    category: 'Design',
    isDefault: true,
    permissions: ['editor:write', 'command:register'],
    commands: [{ id: 'color.insert', label: 'Color Picker: Insert Hex Color' }],
  },
  {
    id: 'plugin-git-tools',
    name: 'Git Tools & Blame Inspector',
    version: '2.1.0',
    author: 'CodeX Core',
    description: 'Adds branch status, unified diff hunks, and quick commit commands to the command palette.',
    category: 'Git',
    isDefault: true,
    permissions: ['files:read', 'command:register'],
    commands: [{ id: 'git.quickStatus', label: 'Git: Inspect Working Tree Status' }],
  },
  {
    id: 'plugin-snippets',
    name: 'Multi-Language Code Snippets',
    version: '1.6.0',
    author: 'CodeX Core',
    description: 'Provides boilerplate templates for React components, Fetch requests, Kotlin classes, and Node servers.',
    category: 'Snippets',
    isDefault: true,
    permissions: ['editor:write', 'command:register'],
    commands: [{ id: 'snippets.insertReact', label: 'Snippet: Insert React Functional Component' }],
  },
  {
    id: 'plugin-code-assistant',
    name: 'Local Code Refactoring Assistant',
    version: '1.2.0',
    author: 'CodeX Core',
    description: 'Deterministic offline code helper that generates JSDoc comments, try/catch wrappers, and JSON interfaces.',
    category: 'Utilities',
    isDefault: true,
    permissions: ['editor:read', 'editor:write', 'command:register'],
    commands: [{ id: 'assistant.jsdoc', label: 'Code Helper: Wrap Selection in Try/Catch' }],
  },
];

export const COMMUNITY_PLUGIN_CATALOG: PluginDefinition[] = [
  {
    id: 'plugin-svg-optimizer',
    name: 'SVG Path Minifier',
    version: '1.1.4',
    author: 'OpenMobile Tools',
    description: 'Strips redundant whitespace and metadata attributes from SVG markup.',
    category: 'Design',
    isDefault: false,
    permissions: ['editor:read', 'editor:write', 'command:register'],
    commands: [{ id: 'svg.minify', label: 'SVG: Compact Markup' }],
  },
  {
    id: 'plugin-env-validator',
    name: 'DotEnv Key Sorter',
    version: '1.0.3',
    author: 'DroidDev Studio',
    description: 'Alphabetically sorts .env and .properties keys while preserving section comments.',
    category: 'Utilities',
    isDefault: false,
    permissions: ['editor:read', 'editor:write', 'command:register'],
    commands: [{ id: 'env.sort', label: 'Properties: Sort Keys Alphabetically' }],
  },
];

export function createInitialPluginStates(): Record<string, PluginState> {
  const now = Date.now();
  const states: Record<string, PluginState> = {};
  for (const plugin of DEFAULT_PLUGINS) {
    states[plugin.id] = {
      pluginId: plugin.id,
      installed: true,
      enabled: true,
      grantedPermissions: [...plugin.permissions],
      installedAt: now,
      updatedAt: now,
    };
  }
  for (const plugin of COMMUNITY_PLUGIN_CATALOG) {
    states[plugin.id] = {
      pluginId: plugin.id,
      installed: false,
      enabled: false,
      grantedPermissions: [],
      installedAt: 0,
      updatedAt: 0,
    };
  }
  return states;
}

export function expandEmmetExpression(expr: string): string | null {
  const clean = expr.trim();
  if (!clean) return null;

  if (clean === '!' || clean === 'html:5') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>
<body>
  
</body>
</html>`;
  }

  // Handle simple parent>child*N patterns like ul>li*3 or div.card>h2+p
  const parts = clean.split('>');
  if (parts.length > 1) {
    const buildNode = (segment: string, depth: number): string => {
      const indent = '  '.repeat(depth);
      const multMatch = segment.match(/^([a-zA-Z0-9.#_-]+)\*(\d+)$/);
      if (multMatch) {
        const count = Math.min(20, Math.max(1, Number(multMatch[2])));
        return Array.from({ length: count }, (_, idx) =>
          buildSingleTag(multMatch[1], indent, `Item ${idx + 1}`)
        ).join('\n');
      }
      return buildSingleTag(segment, indent, '');
    };

    const wrapRecursive = (index: number): string => {
      const indent = '  '.repeat(index);
      const seg = parts[index];
      if (index === parts.length - 1) {
        if (seg.includes('+')) {
          return seg
            .split('+')
            .map((s) => buildNode(s, index))
            .join('\n');
        }
        return buildNode(seg, index);
      }
      const { tag, attrs } = parseTagSelector(seg);
      const inner = wrapRecursive(index + 1);
      return `${indent}<${tag}${attrs}>\n${inner}\n${indent}</${tag}>`;
    };

    return wrapRecursive(0);
  }

  const singleMult = clean.match(/^([a-zA-Z0-9.#_-]+)\*(\d+)$/);
  if (singleMult) {
    const count = Math.min(20, Math.max(1, Number(singleMult[2])));
    return Array.from({ length: count }, (_, idx) =>
      buildSingleTag(singleMult[1], '', `Item ${idx + 1}`)
    ).join('\n');
  }

  if (/^[a-zA-Z][a-zA-Z0-9]*([.#][a-zA-Z0-9_-]+)*$/.test(clean)) {
    return buildSingleTag(clean, '', '');
  }

  return null;
}

function parseTagSelector(selector: string): { tag: string; attrs: string } {
  let tag = 'div';
  let idAttr = '';
  const classes: string[] = [];

  const tokens = selector.match(/([.#]?[a-zA-Z0-9_-]+)/g) || ['div'];
  for (const tok of tokens) {
    if (tok.startsWith('#')) {
      idAttr = tok.slice(1);
    } else if (tok.startsWith('.')) {
      classes.push(tok.slice(1));
    } else {
      tag = tok;
    }
  }

  let attrs = '';
  if (idAttr) attrs += ` id="${idAttr}"`;
  if (classes.length > 0) attrs += ` class="${classes.join(' ')}"`;
  return { tag, attrs };
}

function buildSingleTag(selector: string, indent: string, innerText: string): string {
  const { tag, attrs } = parseTagSelector(selector);
  const selfClosing = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);
  if (selfClosing.has(tag.toLowerCase())) {
    return `${indent}<${tag}${attrs} />`;
  }
  return `${indent}<${tag}${attrs}>${innerText}</${tag}>`;
}
