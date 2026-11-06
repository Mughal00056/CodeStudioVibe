export type SupportedLanguageId =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'json'
  | 'xml'
  | 'svg'
  | 'java'
  | 'kotlin'
  | 'python'
  | 'c'
  | 'cpp'
  | 'rust'
  | 'go'
  | 'php'
  | 'ruby'
  | 'markdown'
  | 'yaml'
  | 'sql'
  | 'shell'
  | 'gradle'
  | 'properties'
  | 'toml'
  | 'plaintext';

export type ProjectTemplateId =
  | 'empty'
  | 'html'
  | 'css'
  | 'javascript'
  | 'react'
  | 'typescript'
  | 'nodejs'
  | 'php'
  | 'custom';

export type BuiltInThemeId =
  | 'dark'
  | 'light'
  | 'dracula'
  | 'monokai'
  | 'one-dark'
  | 'github-dark'
  | 'nord'
  | 'solarized';

export type ThemeId = BuiltInThemeId | string;

export interface VirtualFile {
  id: string;
  projectId: string;
  path: string; // e.g. "src/App.tsx" or "index.html"
  name: string;
  parentPath: string; // "" for root, or "src"
  type: 'file' | 'folder';
  content: string;
  size: number;
  lastModified: number;
  isHidden?: boolean;
}

export interface Project {
  id: string;
  name: string;
  template: ProjectTemplateId;
  rootPath: string;
  storageType: 'internal' | 'saf' | 'github';
  safTreeUri?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  gitInitialized?: boolean;
  githubRepoUrl?: string;
}

export interface RecentFileEntry {
  projectId: string;
  projectName: string;
  filePath: string;
  fileName: string;
  language: SupportedLanguageId;
  openedAt: number;
}

export interface EditorTab {
  id: string; // `${projectId}::${path}`
  projectId: string;
  path: string;
  name: string;
  language: SupportedLanguageId;
  content: string;
  savedContent: string;
  isDirty: boolean;
  cursorLine: number;
  cursorCol: number;
  selectionLength: number;
}

export interface FormattingOptions {
  tabWidth: number;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  formatOnSave: boolean;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  lineHeight: number;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveDelayMs: number;
  autoIndent: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  cursorStyle: 'line' | 'block' | 'underline';
  bracketClosing: boolean;
  tagClosing: boolean;
  codeFolding: boolean;
  formatting: FormattingOptions;
}

export interface TerminalSettings {
  defaultShell: '/bin/bash' | '/bin/sh' | '/system/bin/sh';
  fontSize: number;
  themeId: ThemeId;
  workingDirectory: string;
}

export interface FileManagerSettings {
  showHiddenFiles: boolean;
  sortBy: 'name' | 'modified' | 'size' | 'type';
  sortDirection: 'asc' | 'desc';
  defaultFolder: string;
  confirmDelete: boolean;
}

export interface PreviewSettings {
  defaultViewport: 'mobile' | 'tablet' | 'desktop' | 'responsive';
  autoRefresh: boolean;
  javascriptEnabled: boolean;
  customWidth: number;
  customHeight: number;
}

export interface GeneralSettings {
  language: 'en' | 'es' | 'de' | 'fr' | 'ja' | 'hi';
  appearance: 'dark' | 'light' | 'system';
  defaultProjectFolder: string;
  startupScreen: 'home' | 'editor' | 'projects';
  confirmBeforeDelete: boolean;
  sidebarWidth: number;
  toolbarCompact: boolean;
}

export interface AppSettings {
  themeId: ThemeId;
  general: GeneralSettings;
  editor: EditorSettings;
  terminal: TerminalSettings;
  fileManager: FileManagerSettings;
  preview: PreviewSettings;
}

export interface IDETheme {
  id: ThemeId;
  name: string;
  isDark: boolean;
  isCustom?: boolean;
  ui: {
    bgPrimary: string;
    bgSecondary: string;
    bgElevated: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentText: string;
  };
  editor: {
    background: string;
    foreground: string;
    gutterBackground: string;
    gutterForeground: string;
    activeLineBackground: string;
    selectionBackground: string;
    cursorColor: string;
    keyword: string;
    string: string;
    number: string;
    comment: string;
    function: string;
    variable: string;
    type: string;
    operator: string;
    tag: string;
    attribute: string;
    punctuation: string;
  };
  terminal: {
    background: string;
    foreground: string;
    cursor: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
  };
}

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  shell: string;
  isRunningProcess: boolean;
  activeCommand?: string;
  runtimeMode: 'capacitor' | 'server' | 'sandbox';
  createdAt: number;
}

export interface PreviewConsoleEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'staged';

export interface GitStatusEntry {
  path: string;
  status: GitFileStatus;
  staged: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  branch: string;
  filesChanged: number;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  connectedAt: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  htmlUrl: string;
  cloneUrl: string;
  language: string;
  stargazersCount: number;
  defaultBranch: string;
  updatedAt: string;
}

export type PluginPermission =
  | 'editor:read'
  | 'editor:write'
  | 'files:read'
  | 'files:write'
  | 'theme:register'
  | 'command:register'
  | 'toolbar:register'
  | 'preview:read'
  | 'network:fetch';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'Formatter' | 'Productivity' | 'Linter' | 'Markdown' | 'Design' | 'Git' | 'Snippets' | 'Utilities';
  isDefault: boolean;
  permissions: PluginPermission[];
  commands?: Array<{
    id: string;
    label: string;
    shortcut?: string;
  }>;
  toolbarAction?: {
    id: string;
    label: string;
    iconName: string;
  };
}

export interface PluginState {
  pluginId: string;
  installed: boolean;
  enabled: boolean;
  grantedPermissions: PluginPermission[];
  installedAt: number;
  updatedAt: number;
}

export type ToolchainId =
  | 'nodejs'
  | 'python'
  | 'java'
  | 'kotlin'
  | 'c'
  | 'cpp'
  | 'php'
  | 'rust'
  | 'go';

export interface ToolchainInfo {
  id: ToolchainId;
  name: string;
  binaryName: string;
  installed: boolean;
  version: string | null;
  binaryPath: string | null;
  architecture: string;
  termuxPackage: string;
  installNotes: string;
  customPath?: string;
  envVars?: Record<string, string>;
}

export interface BackupSnapshot {
  id: string;
  name: string;
  type: 'full' | 'project' | 'settings';
  projectId?: string;
  createdAt: number;
  sizeBytes: number;
  projectCount: number;
  fileCount: number;
  payloadJson: string;
}

export type ActiveRoute =
  | 'home'
  | 'editor'
  | 'projects'
  | 'terminal'
  | 'preview'
  | 'plugins'
  | 'github'
  | 'settings';

export type SidebarPanel = 'explorer' | 'search' | 'git' | 'toolchains' | 'outline';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  detail?: string;
}
