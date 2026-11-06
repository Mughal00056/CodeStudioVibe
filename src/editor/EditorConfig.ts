import type { AppSettings, EditorSettings } from '../types';

export const EDITOR_FONT_FAMILIES = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Fira Code / Mono', value: "'Fira Code', 'JetBrains Mono', monospace" },
  { label: 'System Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
];

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 2,
  lineHeight: 1.6,
  wordWrap: true,
  autoSave: true,
  autoSaveDelayMs: 900,
  autoIndent: true,
  lineNumbers: true,
  minimap: false,
  cursorStyle: 'line',
  bracketClosing: true,
  tagClosing: true,
  codeFolding: true,
  formatting: {
    tabWidth: 2,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    formatOnSave: false,
  },
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeId: 'dark',
  general: {
    language: 'en',
    appearance: 'dark',
    defaultProjectFolder: '/storage/emulated/0/CodeXStudio',
    startupScreen: 'home',
    confirmBeforeDelete: true,
    sidebarWidth: 264,
    toolbarCompact: false,
  },
  editor: DEFAULT_EDITOR_SETTINGS,
  terminal: {
    defaultShell: '/bin/bash',
    fontSize: 13,
    themeId: 'dark',
    workingDirectory: '/storage/emulated/0/CodeXStudio',
  },
  fileManager: {
    showHiddenFiles: false,
    sortBy: 'name',
    sortDirection: 'asc',
    defaultFolder: '/storage/emulated/0/CodeXStudio',
    confirmDelete: true,
  },
  preview: {
    defaultViewport: 'responsive',
    autoRefresh: true,
    javascriptEnabled: true,
    customWidth: 390,
    customHeight: 844,
  },
};
