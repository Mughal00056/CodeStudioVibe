import type { SupportedLanguageId } from '../types';

export interface LanguageMetadata {
  id: SupportedLanguageId;
  label: string;
  shortCode: string;
  extensions: string[];
  hasFormatter: boolean;
  hasFolding: boolean;
  commentPrefix: string;
  blockComment?: [string, string];
}

export const LANGUAGE_CATALOG: Record<SupportedLanguageId, LanguageMetadata> = {
  html: {
    id: 'html',
    label: 'HTML',
    shortCode: 'HTML',
    extensions: ['.html', '.htm'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '<!--',
    blockComment: ['<!--', '-->'],
  },
  css: {
    id: 'css',
    label: 'CSS',
    shortCode: 'CSS',
    extensions: ['.css', '.scss', '.less'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '/*',
    blockComment: ['/*', '*/'],
  },
  javascript: {
    id: 'javascript',
    label: 'JavaScript',
    shortCode: 'JS',
    extensions: ['.js', '.mjs', '.cjs'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  typescript: {
    id: 'typescript',
    label: 'TypeScript',
    shortCode: 'TS',
    extensions: ['.ts', '.mts', '.cts'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  jsx: {
    id: 'jsx',
    label: 'JSX',
    shortCode: 'JSX',
    extensions: ['.jsx'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['{/*', '*/}'],
  },
  tsx: {
    id: 'tsx',
    label: 'TSX',
    shortCode: 'TSX',
    extensions: ['.tsx'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['{/*', '*/}'],
  },
  json: {
    id: 'json',
    label: 'JSON',
    shortCode: 'JSON',
    extensions: ['.json', '.jsonc'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '//',
  },
  xml: {
    id: 'xml',
    label: 'XML',
    shortCode: 'XML',
    extensions: ['.xml', '.plist', '.xhtml'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '<!--',
    blockComment: ['<!--', '-->'],
  },
  svg: {
    id: 'svg',
    label: 'SVG',
    shortCode: 'SVG',
    extensions: ['.svg'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '<!--',
    blockComment: ['<!--', '-->'],
  },
  java: {
    id: 'java',
    label: 'Java',
    shortCode: 'JAVA',
    extensions: ['.java'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  kotlin: {
    id: 'kotlin',
    label: 'Kotlin',
    shortCode: 'KT',
    extensions: ['.kt', '.kts'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  python: {
    id: 'python',
    label: 'Python',
    shortCode: 'PY',
    extensions: ['.py', '.pyw'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '#',
  },
  c: {
    id: 'c',
    label: 'C',
    shortCode: 'C',
    extensions: ['.c', '.h'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    shortCode: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  rust: {
    id: 'rust',
    label: 'Rust',
    shortCode: 'RS',
    extensions: ['.rs'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  go: {
    id: 'go',
    label: 'Go',
    shortCode: 'GO',
    extensions: ['.go'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  php: {
    id: 'php',
    label: 'PHP',
    shortCode: 'PHP',
    extensions: ['.php', '.phtml'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  ruby: {
    id: 'ruby',
    label: 'Ruby',
    shortCode: 'RB',
    extensions: ['.rb', '.rake'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '#',
  },
  markdown: {
    id: 'markdown',
    label: 'Markdown',
    shortCode: 'MD',
    extensions: ['.md', '.mdx', '.markdown'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '<!--',
    blockComment: ['<!--', '-->'],
  },
  yaml: {
    id: 'yaml',
    label: 'YAML',
    shortCode: 'YAML',
    extensions: ['.yml', '.yaml'],
    hasFormatter: true,
    hasFolding: true,
    commentPrefix: '#',
  },
  sql: {
    id: 'sql',
    label: 'SQL',
    shortCode: 'SQL',
    extensions: ['.sql'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '--',
    blockComment: ['/*', '*/'],
  },
  shell: {
    id: 'shell',
    label: 'Shell',
    shortCode: 'SH',
    extensions: ['.sh', '.bash', '.zsh'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '#',
  },
  gradle: {
    id: 'gradle',
    label: 'Gradle',
    shortCode: 'GRADLE',
    extensions: ['.gradle'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '//',
    blockComment: ['/*', '*/'],
  },
  properties: {
    id: 'properties',
    label: 'Properties',
    shortCode: 'PROP',
    extensions: ['.properties', '.env', '.gitignore', '.editorconfig'],
    hasFormatter: false,
    hasFolding: false,
    commentPrefix: '#',
  },
  toml: {
    id: 'toml',
    label: 'TOML',
    shortCode: 'TOML',
    extensions: ['.toml'],
    hasFormatter: false,
    hasFolding: true,
    commentPrefix: '#',
  },
  plaintext: {
    id: 'plaintext',
    label: 'Plain Text',
    shortCode: 'TXT',
    extensions: ['.txt', '.log'],
    hasFormatter: false,
    hasFolding: false,
    commentPrefix: '#',
  },
};

export function detectLanguage(fileName: string): SupportedLanguageId {
  const lower = fileName.toLowerCase().trim();
  if (lower === 'build.gradle' || lower === 'settings.gradle' || lower.endsWith('.gradle')) {
    return 'gradle';
  }
  if (lower.endsWith('.gradle.kts')) {
    return 'kotlin';
  }
  if (lower === 'dockerfile' || lower === 'makefile') {
    return 'shell';
  }
  if (lower.startsWith('.env') || lower === '.gitignore' || lower === '.npmrc') {
    return 'properties';
  }

  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx === -1) return 'plaintext';
  const ext = lower.slice(dotIdx);

  for (const meta of Object.values(LANGUAGE_CATALOG)) {
    if (meta.extensions.includes(ext)) {
      return meta.id;
    }
  }
  return 'plaintext';
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, exp);
  return `${val >= 10 || exp === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[exp]}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function joinPath(parent: string, name: string): string {
  const cleanParent = parent.replace(/^\/+|\/+$/g, '');
  const cleanName = name.replace(/^\/+|\/+$/g, '');
  return cleanParent ? `${cleanParent}/${cleanName}` : cleanName;
}

export function getParentPath(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx === -1 ? '' : filePath.slice(0, idx);
}

export function getBaseName(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx === -1 ? filePath : filePath.slice(idx + 1);
}

export function isValidEntryName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') return false;
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) return false;
  return true;
}
