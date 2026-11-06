import { create } from 'zustand';
import type {
  ActiveRoute,
  AppSettings,
  BackupSnapshot,
  EditorTab,
  GitHubRepo,
  GitHubUser,
  IDETheme,
  PluginPermission,
  PluginState,
  PreviewConsoleEntry,
  Project,
  ProjectTemplateId,
  RecentFileEntry,
  SidebarPanel,
  TerminalSession,
  ThemeId,
  ToastMessage,
  ToolchainId,
  ToolchainInfo,
  VirtualFile,
} from '../types';
import { DEFAULT_APP_SETTINGS } from '../editor/EditorConfig';
import { CodeFormatter } from '../editor/CodeFormatter';
import { StorageService } from '../services/StorageService';
import { FileSystemService } from '../services/FileSystem';
import { GitService, type LocalGitRepoState } from '../services/GitService';
import { BackupService, type WorkspaceBackupPayload } from '../services/BackupService';
import { createInitialPluginStates } from '../plugins/defaultPlugins';
import { instantiateProjectFromTemplate } from '../utils/projectTemplates';
import {
  detectLanguage,
  getBaseName,
  getParentPath,
  joinPath,
} from '../utils/languageUtils';

const STORAGE_KEYS = {
  projects: 'projects_v1',
  files: 'files_v1',
  activeProjectId: 'active_project_id_v1',
  settings: 'settings_v1',
  openTabs: 'open_tabs_v1',
  activeTabId: 'active_tab_id_v1',
  closedTabs: 'closed_tabs_v1',
  recentFiles: 'recent_files_v1',
  customThemes: 'custom_themes_v1',
  pluginStates: 'plugin_states_v1',
  backups: 'backups_v1',
};

const autoSaveTimers = new Map<string, number>();

interface IDEState {
  hydrated: boolean;
  projects: Project[];
  files: VirtualFile[];
  activeProjectId: string | null;
  openTabs: EditorTab[];
  activeTabId: string | null;
  closedTabs: EditorTab[];
  recentFiles: RecentFileEntry[];
  settings: AppSettings;
  customThemes: IDETheme[];
  pluginStates: Record<string, PluginState>;
  gitRepos: Record<string, LocalGitRepoState>;
  githubUser: GitHubUser | null;
  githubToken: string | null;
  githubRepos: GitHubRepo[];
  toolchains: ToolchainInfo[];
  toolchainsLoading: boolean;
  terminalSessions: TerminalSession[];
  activeTerminalId: string | null;
  previewConsole: PreviewConsoleEntry[];
  previewRefreshNonce: number;
  backups: BackupSnapshot[];

  // UI Navigation State
  activeRoute: ActiveRoute;
  sidebarOpen: boolean;
  sidebarPanel: SidebarPanel;
  bottomTerminalOpen: boolean;
  splitPreviewOpen: boolean;
  commandPaletteOpen: boolean;
  searchPanelOpen: boolean;
  goToLineOpen: boolean;
  toasts: ToastMessage[];

  // Lifecycle
  hydrate: () => Promise<void>;
  pushToast: (type: ToastMessage['type'], title: string, detail?: string) => void;
  dismissToast: (id: string) => void;

  // Navigation & Layout
  setActiveRoute: (route: ActiveRoute) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  setBottomTerminalOpen: (open: boolean) => void;
  setSplitPreviewOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchPanelOpen: (open: boolean) => void;
  setGoToLineOpen: (open: boolean) => void;

  // Project Management
  createProject: (
    name: string,
    template: ProjectTemplateId,
    storageType?: 'internal' | 'saf' | 'github',
    customFiles?: Record<string, string>,
    safTreeUri?: string
  ) => Promise<Project>;
  openProject: (projectId: string, navigateToEditor?: boolean) => Promise<void>;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<void>;

  // File Explorer Operations
  createFile: (projectId: string, parentPath: string, name: string, content?: string) => Promise<VirtualFile>;
  createFolder: (projectId: string, parentPath: string, name: string) => Promise<VirtualFile>;
  renameEntry: (projectId: string, oldPath: string, newName: string) => Promise<void>;
  deleteEntries: (projectId: string, paths: string[]) => Promise<void>;
  copyOrMoveEntries: (
    projectId: string,
    sourcePaths: string[],
    targetFolder: string,
    mode: 'copy' | 'move'
  ) => Promise<void>;
  importFilesMap: (projectId: string, parentPath: string, fileMap: Record<string, string>) => Promise<number>;
  refreshProjectFromServer: (projectId: string) => Promise<void>;

  // Editor Tab Operations
  openFileInTab: (projectId: string, filePath: string, navigate?: boolean) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => Promise<void>;
  saveTabAs: (tabId: string, newFilePath: string) => Promise<void>;
  saveAllTabs: () => Promise<void>;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  reopenClosedTab: () => void;
  updateTabCursor: (tabId: string, line: number, col: number, selectionLength: number) => void;
  formatTabWithPrettier: (tabId: string) => Promise<boolean>;

  // Terminal & Preview
  addTerminalSession: (session: TerminalSession) => void;
  removeTerminalSession: (sessionId: string) => void;
  setActiveTerminalId: (sessionId: string) => void;
  updateTerminalSession: (sessionId: string, patch: Partial<TerminalSession>) => void;
  appendPreviewConsole: (entry: Omit<PreviewConsoleEntry, 'id' | 'timestamp'>) => void;
  clearPreviewConsole: () => void;
  triggerPreviewRefresh: () => void;

  // Git & GitHub
  loadGitState: (projectId: string) => Promise<void>;
  initGitRepo: (projectId: string) => Promise<void>;
  stageGitFile: (projectId: string, path: string) => Promise<void>;
  unstageGitFile: (projectId: string, path: string) => Promise<void>;
  stageAllGitFiles: (projectId: string) => Promise<void>;
  commitGitChanges: (projectId: string, message: string) => Promise<void>;
  createGitBranch: (projectId: string, branchName: string) => Promise<void>;
  checkoutGitBranch: (projectId: string, branchName: string) => Promise<void>;
  mergeGitBranch: (projectId: string, sourceBranch: string) => Promise<void>;
  connectGitHub: (token: string) => Promise<void>;
  disconnectGitHub: () => Promise<void>;
  cloneGitHubRepository: (repo: GitHubRepo) => Promise<Project>;

  // Plugins & Toolchains
  installPlugin: (pluginId: string) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  togglePluginEnabled: (pluginId: string) => Promise<void>;
  togglePluginPermission: (pluginId: string, perm: PluginPermission) => Promise<void>;
  probeToolchains: () => Promise<void>;
  updateToolchainConfig: (id: ToolchainId, customPath: string, envVars: Record<string, string>) => void;

  // Themes, Settings & Backups
  setTheme: (themeId: ThemeId) => Promise<void>;
  saveCustomTheme: (theme: IDETheme) => Promise<void>;
  deleteCustomTheme: (themeId: string) => Promise<void>;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  createBackup: (name: string, type: 'full' | 'project' | 'settings', projectId?: string) => Promise<BackupSnapshot>;
  restoreBackup: (snapshotId: string) => Promise<void>;
  restoreFromPayload: (payload: WorkspaceBackupPayload) => Promise<void>;
  deleteBackup: (snapshotId: string) => Promise<void>;
}

export const useIDEStore = create<IDEState>((set, get) => ({
  hydrated: false,
  projects: [],
  files: [],
  activeProjectId: null,
  openTabs: [],
  activeTabId: null,
  closedTabs: [],
  recentFiles: [],
  settings: DEFAULT_APP_SETTINGS,
  customThemes: [],
  pluginStates: createInitialPluginStates(),
  gitRepos: {},
  githubUser: null,
  githubToken: null,
  githubRepos: [],
  toolchains: [],
  toolchainsLoading: false,
  terminalSessions: [],
  activeTerminalId: null,
  previewConsole: [],
  previewRefreshNonce: 1,
  backups: [],

  activeRoute: 'home',
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  sidebarPanel: 'explorer',
  bottomTerminalOpen: false,
  splitPreviewOpen: false,
  commandPaletteOpen: false,
  searchPanelOpen: false,
  goToLineOpen: false,
  toasts: [],

  pushToast: (type, title, detail) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, type, title, detail }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 3600);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  hydrate: async () => {
    if (get().hydrated) return;

    const [
      savedProjects,
      savedFiles,
      savedActiveProjectId,
      savedSettings,
      savedOpenTabs,
      savedActiveTabId,
      savedClosedTabs,
      savedRecentFiles,
      savedCustomThemes,
      savedPluginStates,
      savedBackups,
      ghSession,
    ] = await Promise.all([
      StorageService.getItem<Project[]>(STORAGE_KEYS.projects, []),
      StorageService.getItem<VirtualFile[]>(STORAGE_KEYS.files, []),
      StorageService.getItem<string | null>(STORAGE_KEYS.activeProjectId, null),
      StorageService.getItem<AppSettings>(STORAGE_KEYS.settings, DEFAULT_APP_SETTINGS),
      StorageService.getItem<EditorTab[]>(STORAGE_KEYS.openTabs, []),
      StorageService.getItem<string | null>(STORAGE_KEYS.activeTabId, null),
      StorageService.getItem<EditorTab[]>(STORAGE_KEYS.closedTabs, []),
      StorageService.getItem<RecentFileEntry[]>(STORAGE_KEYS.recentFiles, []),
      StorageService.getItem<IDETheme[]>(STORAGE_KEYS.customThemes, []),
      StorageService.getItem<Record<string, PluginState>>(
        STORAGE_KEYS.pluginStates,
        createInitialPluginStates()
      ),
      StorageService.getItem<BackupSnapshot[]>(STORAGE_KEYS.backups, []),
      GitService.getSavedGitHubSession(),
    ]);

    let projects = savedProjects;
    let files = savedFiles;
    let activeProjectId = savedActiveProjectId;
    let openTabs = savedOpenTabs;
    let activeTabId = savedActiveTabId;
    let recentFiles = savedRecentFiles;

    // Seed starter projects on first launch so the workspace has real editable files
    if (projects.length === 0) {
      const webApp = instantiateProjectFromTemplate('Pulse Sprint Board', 'html', 'internal');
      const nodeApp = instantiateProjectFromTemplate('CodeX Node Worker', 'nodejs', 'internal');
      projects = [webApp.project, nodeApp.project];
      files = [...webApp.files, ...nodeApp.files];
      activeProjectId = webApp.project.id;

      const indexFile = webApp.files.find((f) => f.path === 'index.html');
      const appJsFile = webApp.files.find((f) => f.path === 'scripts/app.js');
      const initialTabs: EditorTab[] = [];
      if (indexFile) {
        initialTabs.push({
          id: `${webApp.project.id}::${indexFile.path}`,
          projectId: webApp.project.id,
          path: indexFile.path,
          name: indexFile.name,
          language: 'html',
          content: indexFile.content,
          savedContent: indexFile.content,
          isDirty: false,
          cursorLine: 1,
          cursorCol: 1,
          selectionLength: 0,
        });
      }
      if (appJsFile) {
        initialTabs.push({
          id: `${webApp.project.id}::${appJsFile.path}`,
          projectId: webApp.project.id,
          path: appJsFile.path,
          name: appJsFile.name,
          language: 'javascript',
          content: appJsFile.content,
          savedContent: appJsFile.content,
          isDirty: false,
          cursorLine: 1,
          cursorCol: 1,
          selectionLength: 0,
        });
      }
      openTabs = initialTabs;
      activeTabId = initialTabs[0]?.id || null;
      recentFiles = initialTabs.map((t) => ({
        projectId: t.projectId,
        projectName: webApp.project.name,
        filePath: t.path,
        fileName: t.name,
        language: t.language,
        openedAt: Date.now(),
      }));

      await Promise.all([
        StorageService.setItem(STORAGE_KEYS.projects, projects),
        StorageService.setItem(STORAGE_KEYS.files, files),
        StorageService.setItem(STORAGE_KEYS.activeProjectId, activeProjectId),
        StorageService.setItem(STORAGE_KEYS.openTabs, openTabs),
        StorageService.setItem(STORAGE_KEYS.activeTabId, activeTabId),
        StorageService.setItem(STORAGE_KEYS.recentFiles, recentFiles),
      ]);
    }

    const mergedSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...savedSettings,
      general: { ...DEFAULT_APP_SETTINGS.general, ...(savedSettings.general || {}) },
      editor: {
        ...DEFAULT_APP_SETTINGS.editor,
        ...(savedSettings.editor || {}),
        formatting: {
          ...DEFAULT_APP_SETTINGS.editor.formatting,
          ...(savedSettings.editor?.formatting || {}),
        },
      },
      terminal: { ...DEFAULT_APP_SETTINGS.terminal, ...(savedSettings.terminal || {}) },
      fileManager: { ...DEFAULT_APP_SETTINGS.fileManager, ...(savedSettings.fileManager || {}) },
      preview: { ...DEFAULT_APP_SETTINGS.preview, ...(savedSettings.preview || {}) },
    };

    const startupRoute: ActiveRoute =
      mergedSettings.general.startupScreen === 'editor'
        ? 'editor'
        : mergedSettings.general.startupScreen === 'projects'
          ? 'projects'
          : 'home';

    set({
      hydrated: true,
      projects,
      files,
      activeProjectId: activeProjectId || projects[0]?.id || null,
      openTabs,
      activeTabId,
      closedTabs: savedClosedTabs,
      recentFiles,
      settings: mergedSettings,
      customThemes: savedCustomThemes,
      pluginStates: { ...createInitialPluginStates(), ...savedPluginStates },
      backups: savedBackups,
      githubUser: ghSession.user,
      githubToken: ghSession.token,
      activeRoute: startupRoute,
    });

    const currentProjId = activeProjectId || projects[0]?.id;
    if (currentProjId) {
      const projFiles = files.filter((f) => f.projectId === currentProjId);
      FileSystemService.syncProjectToServer(currentProjId, projFiles, true).catch(() => {});
      get().loadGitState(currentProjId).catch(() => {});
    }
    get().probeToolchains().catch(() => {});
  },

  setActiveRoute: (route) => set({ activeRoute: route }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel, sidebarOpen: true }),
  setBottomTerminalOpen: (open) => set({ bottomTerminalOpen: open }),
  setSplitPreviewOpen: (open) => set({ splitPreviewOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchPanelOpen: (open) => set({ searchPanelOpen: open }),
  setGoToLineOpen: (open) => set({ goToLineOpen: open }),

  createProject: async (name, template, storageType = 'internal', customFiles, safTreeUri) => {
    const { project, files: newFiles } = instantiateProjectFromTemplate(
      name,
      template,
      storageType,
      customFiles
    );
    if (safTreeUri) {
      project.safTreeUri = safTreeUri;
    }

    const nextProjects = [project, ...get().projects];
    const nextFiles = [...get().files, ...newFiles];

    const firstFile =
      newFiles.find((f) => f.path === 'index.html') ||
      newFiles.find((f) => f.type === 'file');

    let nextTabs = get().openTabs;
    let nextActiveTabId = get().activeTabId;

    if (firstFile) {
      const tabId = `${project.id}::${firstFile.path}`;
      const tab: EditorTab = {
        id: tabId,
        projectId: project.id,
        path: firstFile.path,
        name: firstFile.name,
        language: detectLanguage(firstFile.name),
        content: firstFile.content,
        savedContent: firstFile.content,
        isDirty: false,
        cursorLine: 1,
        cursorCol: 1,
        selectionLength: 0,
      };
      nextTabs = [...nextTabs, tab];
      nextActiveTabId = tabId;
    }

    set({
      projects: nextProjects,
      files: nextFiles,
      activeProjectId: project.id,
      openTabs: nextTabs,
      activeTabId: nextActiveTabId,
      activeRoute: 'editor',
    });

    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.projects, nextProjects),
      StorageService.setItem(STORAGE_KEYS.files, nextFiles),
      StorageService.setItem(STORAGE_KEYS.activeProjectId, project.id),
      StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs),
      StorageService.setItem(STORAGE_KEYS.activeTabId, nextActiveTabId),
    ]);

    await FileSystemService.syncProjectToServer(project.id, newFiles, true);
    await get().loadGitState(project.id);
    get().pushToast('success', `Created ${project.name}`);
    return project;
  },

  openProject: async (projectId, navigateToEditor = true) => {
    const proj = get().projects.find((p) => p.id === projectId);
    if (!proj) return;

    const projFiles = get().files.filter((f) => f.projectId === projectId);
    await FileSystemService.syncProjectToServer(projectId, projFiles, true);
    await get().loadGitState(projectId);

    const existingTab = get().openTabs.find((t) => t.projectId === projectId);
    if (existingTab) {
      set({
        activeProjectId: projectId,
        activeTabId: existingTab.id,
        ...(navigateToEditor ? { activeRoute: 'editor' } : {}),
      });
    } else {
      const entry =
        projFiles.find((f) => f.path === 'index.html') ||
        projFiles.find((f) => f.type === 'file');
      if (entry) {
        get().openFileInTab(projectId, entry.path, navigateToEditor);
      } else if (navigateToEditor) {
        set({ activeProjectId: projectId, activeRoute: 'editor' });
      }
    }

    set({ activeProjectId: projectId });
    await StorageService.setItem(STORAGE_KEYS.activeProjectId, projectId);
  },

  renameProject: async (projectId, newName) => {
    const clean = newName.trim();
    if (!clean) return;
    const nextProjects = get().projects.map((p) =>
      p.id === projectId ? { ...p, name: clean, updatedAt: Date.now() } : p
    );
    set({ projects: nextProjects });
    await StorageService.setItem(STORAGE_KEYS.projects, nextProjects);
    get().pushToast('success', 'Project renamed', clean);
  },

  duplicateProject: async (projectId) => {
    const source = get().projects.find((p) => p.id === projectId);
    if (!source) return null;
    const sourceFiles = get().files.filter((f) => f.projectId === projectId && f.type === 'file');
    const fileMap: Record<string, string> = {};
    for (const f of sourceFiles) {
      fileMap[f.path] = f.content;
    }
    return get().createProject(`${source.name} Copy`, source.template, source.storageType, fileMap);
  },

  deleteProject: async (projectId) => {
    const nextProjects = get().projects.filter((p) => p.id !== projectId);
    const nextFiles = get().files.filter((f) => f.projectId !== projectId);
    const nextTabs = get().openTabs.filter((t) => t.projectId !== projectId);
    const nextRecent = get().recentFiles.filter((r) => r.projectId !== projectId);
    const nextActiveProject =
      get().activeProjectId === projectId ? nextProjects[0]?.id || null : get().activeProjectId;
    const nextActiveTab = nextTabs.some((t) => t.id === get().activeTabId)
      ? get().activeTabId
      : nextTabs[0]?.id || null;

    set({
      projects: nextProjects,
      files: nextFiles,
      activeProjectId: nextActiveProject,
      openTabs: nextTabs,
      activeTabId: nextActiveTab,
      recentFiles: nextRecent,
    });

    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.projects, nextProjects),
      StorageService.setItem(STORAGE_KEYS.files, nextFiles),
      StorageService.setItem(STORAGE_KEYS.activeProjectId, nextActiveProject),
      StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs),
      StorageService.setItem(STORAGE_KEYS.activeTabId, nextActiveTab),
      StorageService.setItem(STORAGE_KEYS.recentFiles, nextRecent),
    ]);
    get().pushToast('info', 'Project deleted');
  },

  createFile: async (projectId, parentPath, name, content = '') => {
    const filePath = joinPath(parentPath, name.trim());
    const now = Date.now();
    const existing = get().files.find((f) => f.projectId === projectId && f.path === filePath);
    if (existing) {
      get().openFileInTab(projectId, filePath, true);
      return existing;
    }

    const newFile: VirtualFile = {
      id: `file_${projectId}_${filePath}_${now}`,
      projectId,
      path: filePath,
      name: getBaseName(filePath),
      parentPath: getParentPath(filePath),
      type: 'file',
      content,
      size: new TextEncoder().encode(content).length,
      lastModified: now,
      isHidden: getBaseName(filePath).startsWith('.'),
    };

    const nextFiles = [...get().files, newFile];
    const nextProjects = get().projects.map((p) =>
      p.id === projectId ? { ...p, updatedAt: now } : p
    );

    set({ files: nextFiles, projects: nextProjects });
    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.files, nextFiles),
      StorageService.setItem(STORAGE_KEYS.projects, nextProjects),
    ]);

    FileSystemService.syncProjectToServer(
      projectId,
      nextFiles.filter((f) => f.projectId === projectId)
    ).catch(() => {});

    get().openFileInTab(projectId, filePath, true);
    return newFile;
  },

  createFolder: async (projectId, parentPath, name) => {
    const folderPath = joinPath(parentPath, name.trim());
    const now = Date.now();
    const existing = get().files.find((f) => f.projectId === projectId && f.path === folderPath);
    if (existing) return existing;

    const folder: VirtualFile = {
      id: `folder_${projectId}_${folderPath}_${now}`,
      projectId,
      path: folderPath,
      name: getBaseName(folderPath),
      parentPath: getParentPath(folderPath),
      type: 'folder',
      content: '',
      size: 0,
      lastModified: now,
      isHidden: getBaseName(folderPath).startsWith('.'),
    };

    const nextFiles = [...get().files, folder];
    set({ files: nextFiles });
    await StorageService.setItem(STORAGE_KEYS.files, nextFiles);
    FileSystemService.syncProjectToServer(
      projectId,
      nextFiles.filter((f) => f.projectId === projectId)
    ).catch(() => {});
    return folder;
  },

  renameEntry: async (projectId, oldPath, newName) => {
    const parent = getParentPath(oldPath);
    const newPath = joinPath(parent, newName.trim());
    if (oldPath === newPath) return;

    const now = Date.now();
    const nextFiles = get().files.map((f) => {
      if (f.projectId !== projectId) return f;
      if (f.path === oldPath) {
        return {
          ...f,
          path: newPath,
          name: getBaseName(newPath),
          parentPath: getParentPath(newPath),
          lastModified: now,
          isHidden: getBaseName(newPath).startsWith('.'),
        };
      }
      if (f.path.startsWith(oldPath + '/')) {
        const updated = newPath + f.path.slice(oldPath.length);
        return {
          ...f,
          path: updated,
          parentPath: getParentPath(updated),
          lastModified: now,
        };
      }
      return f;
    });

    const nextTabs = get().openTabs.map((t) => {
      if (t.projectId !== projectId) return t;
      if (t.path === oldPath || t.path.startsWith(oldPath + '/')) {
        const updatedPath =
          t.path === oldPath ? newPath : newPath + t.path.slice(oldPath.length);
        const updatedName = getBaseName(updatedPath);
        return {
          ...t,
          id: `${projectId}::${updatedPath}`,
          path: updatedPath,
          name: updatedName,
          language: detectLanguage(updatedName),
        };
      }
      return t;
    });

    const oldTabId = `${projectId}::${oldPath}`;
    const nextActiveTabId =
      get().activeTabId === oldTabId ? `${projectId}::${newPath}` : get().activeTabId;

    set({ files: nextFiles, openTabs: nextTabs, activeTabId: nextActiveTabId });
    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.files, nextFiles),
      StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs),
      StorageService.setItem(STORAGE_KEYS.activeTabId, nextActiveTabId),
    ]);

    FileSystemService.syncProjectToServer(
      projectId,
      nextFiles.filter((f) => f.projectId === projectId),
      true
    ).catch(() => {});
  },

  deleteEntries: async (projectId, paths) => {
    const pathSet = new Set(paths);
    const shouldRemove = (p: string) => {
      if (pathSet.has(p)) return true;
      for (const target of paths) {
        if (p.startsWith(target + '/')) return true;
      }
      return false;
    };

    const nextFiles = get().files.filter(
      (f) => f.projectId !== projectId || !shouldRemove(f.path)
    );
    const nextTabs = get().openTabs.filter(
      (t) => t.projectId !== projectId || !shouldRemove(t.path)
    );
    const nextActiveTab = nextTabs.some((t) => t.id === get().activeTabId)
      ? get().activeTabId
      : nextTabs[0]?.id || null;

    set({ files: nextFiles, openTabs: nextTabs, activeTabId: nextActiveTab });
    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.files, nextFiles),
      StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs),
      StorageService.setItem(STORAGE_KEYS.activeTabId, nextActiveTab),
    ]);

    FileSystemService.syncProjectToServer(
      projectId,
      nextFiles.filter((f) => f.projectId === projectId),
      true
    ).catch(() => {});
  },

  copyOrMoveEntries: async (projectId, sourcePaths, targetFolder, mode) => {
    const now = Date.now();
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const added: VirtualFile[] = [];

    for (const srcPath of sourcePaths) {
      const base = getBaseName(srcPath);
      const destBase = joinPath(targetFolder, base);
      const matching = projFiles.filter(
        (f) => f.path === srcPath || f.path.startsWith(srcPath + '/')
      );

      for (const item of matching) {
        const suffix = item.path.slice(srcPath.length);
        const newPath = destBase + suffix;
        if (newPath === item.path) continue;
        added.push({
          ...item,
          id: `${item.type}_${projectId}_${newPath}_${now}_${Math.random().toString(36).slice(2, 5)}`,
          path: newPath,
          name: getBaseName(newPath),
          parentPath: getParentPath(newPath),
          lastModified: now,
        });
      }
    }

    if (added.length === 0) return;

    const addedPathSet = new Set(added.map((a) => a.path));
    let nextFiles = get().files.filter(
      (f) => f.projectId !== projectId || !addedPathSet.has(f.path)
    );
    nextFiles = [...nextFiles, ...added];
    set({ files: nextFiles });
    await StorageService.setItem(STORAGE_KEYS.files, nextFiles);

    if (mode === 'move') {
      await get().deleteEntries(
        projectId,
        sourcePaths.filter((s) => joinPath(targetFolder, getBaseName(s)) !== s)
      );
    } else {
      FileSystemService.syncProjectToServer(
        projectId,
        nextFiles.filter((f) => f.projectId === projectId),
        true
      ).catch(() => {});
    }
  },

  importFilesMap: async (projectId, parentPath, fileMap) => {
    const now = Date.now();
    const folderPaths = new Set<string>();
    const newEntries: VirtualFile[] = [];

    for (const [rawRel, content] of Object.entries(fileMap)) {
      const fullRel = joinPath(parentPath, rawRel.replace(/^\/+/, ''));
      const parts = fullRel.split('/');
      for (let i = 1; i < parts.length; i++) {
        folderPaths.add(parts.slice(0, i).join('/'));
      }
      newEntries.push({
        id: `file_${projectId}_${fullRel}_${now}`,
        projectId,
        path: fullRel,
        name: getBaseName(fullRel),
        parentPath: getParentPath(fullRel),
        type: 'file',
        content,
        size: new TextEncoder().encode(content).length,
        lastModified: now,
        isHidden: getBaseName(fullRel).startsWith('.'),
      });
    }

    for (const fp of Array.from(folderPaths).sort()) {
      newEntries.push({
        id: `folder_${projectId}_${fp}_${now}`,
        projectId,
        path: fp,
        name: getBaseName(fp),
        parentPath: getParentPath(fp),
        type: 'folder',
        content: '',
        size: 0,
        lastModified: now,
        isHidden: getBaseName(fp).startsWith('.'),
      });
    }

    const incomingPaths = new Set(newEntries.map((e) => e.path));
    const nextFiles = [
      ...get().files.filter((f) => f.projectId !== projectId || !incomingPaths.has(f.path)),
      ...newEntries,
    ];

    set({ files: nextFiles });
    await StorageService.setItem(STORAGE_KEYS.files, nextFiles);
    FileSystemService.syncProjectToServer(
      projectId,
      nextFiles.filter((f) => f.projectId === projectId)
    ).catch(() => {});

    return Object.keys(fileMap).length;
  },

  refreshProjectFromServer: async (projectId) => {
    const diskFiles = await FileSystemService.fetchProjectFromServer(projectId);
    if (!diskFiles) return;

    const otherFiles = get().files.filter((f) => f.projectId !== projectId);
    const nextFiles = [...otherFiles, ...diskFiles];

    const diskMap = new Map(diskFiles.map((f) => [f.path, f]));
    const nextTabs = get().openTabs.map((t) => {
      if (t.projectId !== projectId || t.isDirty) return t;
      const disk = diskMap.get(t.path);
      if (!disk || disk.type !== 'file') return t;
      return {
        ...t,
        content: disk.content,
        savedContent: disk.content,
      };
    });

    set({ files: nextFiles, openTabs: nextTabs });
    await StorageService.setItem(STORAGE_KEYS.files, nextFiles);
  },

  openFileInTab: (projectId, filePath, navigate = true) => {
    const file = get().files.find(
      (f) => f.projectId === projectId && f.path === filePath && f.type === 'file'
    );
    if (!file) return;

    const tabId = `${projectId}::${file.path}`;
    const existing = get().openTabs.find((t) => t.id === tabId);
    const project = get().projects.find((p) => p.id === projectId);
    const lang = detectLanguage(file.name);

    const recentEntry: RecentFileEntry = {
      projectId,
      projectName: project?.name || 'Workspace',
      filePath: file.path,
      fileName: file.name,
      language: lang,
      openedAt: Date.now(),
    };
    const nextRecent = [
      recentEntry,
      ...get().recentFiles.filter(
        (r) => !(r.projectId === projectId && r.filePath === file.path)
      ),
    ].slice(0, 16);

    if (existing) {
      set({
        activeProjectId: projectId,
        activeTabId: tabId,
        recentFiles: nextRecent,
        ...(navigate ? { activeRoute: 'editor' } : {}),
      });
    } else {
      const newTab: EditorTab = {
        id: tabId,
        projectId,
        path: file.path,
        name: file.name,
        language: lang,
        content: file.content,
        savedContent: file.content,
        isDirty: false,
        cursorLine: 1,
        cursorCol: 1,
        selectionLength: 0,
      };
      const nextTabs = [...get().openTabs, newTab];
      set({
        activeProjectId: projectId,
        openTabs: nextTabs,
        activeTabId: tabId,
        recentFiles: nextRecent,
        ...(navigate ? { activeRoute: 'editor' } : {}),
      });
      StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs).catch(() => {});
    }

    StorageService.setItem(STORAGE_KEYS.activeTabId, tabId).catch(() => {});
    StorageService.setItem(STORAGE_KEYS.recentFiles, nextRecent).catch(() => {});
  },

  setActiveTab: (tabId) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    set({ activeTabId: tabId, activeProjectId: tab.projectId });
    StorageService.setItem(STORAGE_KEYS.activeTabId, tabId).catch(() => {});
  },

  updateTabContent: (tabId, content) => {
    const nextTabs = get().openTabs.map((t) =>
      t.id === tabId
        ? { ...t, content, isDirty: content !== t.savedContent }
        : t
    );
    set({ openTabs: nextTabs });

    const settings = get().settings;
    if (settings.preview.autoRefresh) {
      // Live preview updates immediately from in-memory tab content
      set((s) => ({ previewRefreshNonce: s.previewRefreshNonce + 1 }));
    }

    if (settings.editor.autoSave) {
      const existingTimer = autoSaveTimers.get(tabId);
      if (existingTimer) window.clearTimeout(existingTimer);
      const timer = window.setTimeout(() => {
        autoSaveTimers.delete(tabId);
        get().saveTab(tabId).catch(() => {});
      }, settings.editor.autoSaveDelayMs);
      autoSaveTimers.set(tabId, timer);
    }
  },

  saveTab: async (tabId) => {
    let tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return;

    const settings = get().settings;
    let contentToSave = tab.content;
    if (settings.editor.formatting.formatOnSave && CodeFormatter.isFormattable(tab.language)) {
      const fmt = await CodeFormatter.formatCode(
        contentToSave,
        tab.language,
        settings.editor.formatting
      );
      if (!fmt.error && fmt.changed) {
        contentToSave = fmt.formatted;
      }
    }

    const now = Date.now();
    const nextTabs = get().openTabs.map((t) =>
      t.id === tabId
        ? { ...t, content: contentToSave, savedContent: contentToSave, isDirty: false }
        : t
    );
    const nextFiles = get().files.map((f) =>
      f.projectId === tab!.projectId && f.path === tab!.path
        ? {
            ...f,
            content: contentToSave,
            size: new TextEncoder().encode(contentToSave).length,
            lastModified: now,
          }
        : f
    );

    set((s) => ({
      openTabs: nextTabs,
      files: nextFiles,
      previewRefreshNonce: s.previewRefreshNonce + 1,
    }));

    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.files, nextFiles),
      StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs),
    ]);

    FileSystemService.syncProjectToServer(
      tab.projectId,
      nextFiles.filter((f) => f.projectId === tab!.projectId)
    ).catch(() => {});
  },

  saveTabAs: async (tabId, newFilePath) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    const cleanPath = newFilePath.trim().replace(/^\/+/, '');
    if (!cleanPath) return;
    await get().createFile(tab.projectId, getParentPath(cleanPath), getBaseName(cleanPath), tab.content);
  },

  saveAllTabs: async () => {
    const dirty = get().openTabs.filter((t) => t.isDirty);
    for (const t of dirty) {
      await get().saveTab(t.id);
    }
    get().pushToast('success', 'All modified files saved');
  },

  closeTab: (tabId) => {
    const target = get().openTabs.find((t) => t.id === tabId);
    if (!target) return;

    const idx = get().openTabs.findIndex((t) => t.id === tabId);
    const nextTabs = get().openTabs.filter((t) => t.id !== tabId);
    const nextClosed = [target, ...get().closedTabs].slice(0, 12);

    let nextActive = get().activeTabId;
    if (nextActive === tabId) {
      const neighbor = nextTabs[Math.min(idx, nextTabs.length - 1)];
      nextActive = neighbor ? neighbor.id : null;
    }

    set({ openTabs: nextTabs, activeTabId: nextActive, closedTabs: nextClosed });
    StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs).catch(() => {});
    StorageService.setItem(STORAGE_KEYS.activeTabId, nextActive).catch(() => {});
    StorageService.setItem(STORAGE_KEYS.closedTabs, nextClosed).catch(() => {});
  },

  closeOtherTabs: (tabId) => {
    const keep = get().openTabs.find((t) => t.id === tabId);
    if (!keep) return;
    const closed = get().openTabs.filter((t) => t.id !== tabId);
    const nextClosed = [...closed, ...get().closedTabs].slice(0, 12);
    set({ openTabs: [keep], activeTabId: keep.id, closedTabs: nextClosed });
    StorageService.setItem(STORAGE_KEYS.openTabs, [keep]).catch(() => {});
    StorageService.setItem(STORAGE_KEYS.activeTabId, keep.id).catch(() => {});
  },

  closeAllTabs: () => {
    const nextClosed = [...get().openTabs, ...get().closedTabs].slice(0, 12);
    set({ openTabs: [], activeTabId: null, closedTabs: nextClosed });
    StorageService.setItem(STORAGE_KEYS.openTabs, []).catch(() => {});
    StorageService.setItem(STORAGE_KEYS.activeTabId, null).catch(() => {});
  },

  reopenClosedTab: () => {
    const [last, ...rest] = get().closedTabs;
    if (!last) return;
    const exists = get().openTabs.some((t) => t.id === last.id);
    const nextTabs = exists ? get().openTabs : [...get().openTabs, last];
    set({
      openTabs: nextTabs,
      activeTabId: last.id,
      activeProjectId: last.projectId,
      closedTabs: rest,
    });
    StorageService.setItem(STORAGE_KEYS.openTabs, nextTabs).catch(() => {});
    StorageService.setItem(STORAGE_KEYS.activeTabId, last.id).catch(() => {});
  },

  updateTabCursor: (tabId, line, col, selectionLength) => {
    set((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.id === tabId
          ? { ...t, cursorLine: line, cursorCol: col, selectionLength }
          : t
      ),
    }));
  },

  formatTabWithPrettier: async (tabId) => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return false;

    const prettierState = get().pluginStates['plugin-prettier'];
    if (prettierState && (!prettierState.enabled || !prettierState.grantedPermissions.includes('editor:write'))) {
      get().pushToast('warning', 'Prettier permission required', 'Enable Prettier and grant editor:write permission in Plugins.');
      return false;
    }

    const res = await CodeFormatter.formatCode(
      tab.content,
      tab.language,
      get().settings.editor.formatting
    );
    if (res.error) {
      get().pushToast('error', 'Format failed', res.error);
      return false;
    }
    if (res.changed) {
      get().updateTabContent(tabId, res.formatted);
      get().pushToast('success', 'Formatted document');
    } else {
      get().pushToast('info', 'Document already formatted');
    }
    return true;
  },

  addTerminalSession: (session) => {
    set((s) => ({
      terminalSessions: [...s.terminalSessions, session],
      activeTerminalId: session.id,
    }));
  },

  removeTerminalSession: (sessionId) => {
    const remaining = get().terminalSessions.filter((t) => t.id !== sessionId);
    const nextActive =
      get().activeTerminalId === sessionId
        ? remaining[remaining.length - 1]?.id || null
        : get().activeTerminalId;
    set({ terminalSessions: remaining, activeTerminalId: nextActive });
  },

  setActiveTerminalId: (sessionId) => set({ activeTerminalId: sessionId }),

  updateTerminalSession: (sessionId, patch) => {
    set((s) => ({
      terminalSessions: s.terminalSessions.map((t) =>
        t.id === sessionId ? { ...t, ...patch } : t
      ),
    }));
  },

  appendPreviewConsole: (entry) => {
    set((s) => ({
      previewConsole: [
        ...s.previewConsole.slice(-99),
        {
          ...entry,
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
        },
      ],
    }));
  },

  clearPreviewConsole: () => set({ previewConsole: [] }),
  triggerPreviewRefresh: () =>
    set((s) => ({ previewRefreshNonce: s.previewRefreshNonce + 1 })),

  loadGitState: async (projectId) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.getRepoState(projectId, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
  },

  initGitRepo: async (projectId) => {
    const repo = await GitService.initRepo(projectId);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
    get().pushToast('success', 'Initialized Git repository');
  },

  stageGitFile: async (projectId, path) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.stageFile(projectId, path, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
  },

  unstageGitFile: async (projectId, path) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.unstageFile(projectId, path, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
  },

  stageAllGitFiles: async (projectId) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.stageAll(projectId, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
  },

  commitGitChanges: async (projectId, message) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const author = get().githubUser?.name || 'CodeX Developer';
    const repo = await GitService.commit(projectId, message, projFiles, author);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
    get().pushToast('success', 'Committed changes', message);
  },

  createGitBranch: async (projectId, branchName) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.createBranch(projectId, branchName, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
    get().pushToast('success', `Switched to branch ${repo.currentBranch}`);
  },

  checkoutGitBranch: async (projectId, branchName) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.checkoutBranch(projectId, branchName, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
    get().pushToast('info', `Checked out ${branchName}`);
  },

  mergeGitBranch: async (projectId, sourceBranch) => {
    const projFiles = get().files.filter((f) => f.projectId === projectId);
    const repo = await GitService.mergeBranch(projectId, sourceBranch, projFiles);
    set((s) => ({ gitRepos: { ...s.gitRepos, [projectId]: repo } }));
    get().pushToast('success', `Merged ${sourceBranch}`);
  },

  connectGitHub: async (token) => {
    const { user, repos } = await GitService.connectGitHubWithToken(token);
    set({ githubUser: user, githubRepos: repos });
    get().pushToast('success', `Connected GitHub as @${user.login}`);
  },

  disconnectGitHub: async () => {
    await GitService.disconnectGitHub();
    set({ githubUser: null, githubToken: null, githubRepos: [] });
    get().pushToast('info', 'Disconnected GitHub account');
  },

  cloneGitHubRepository: async (repo) => {
    const fileMap = await GitService.fetchGitHubRepoFiles(
      repo.fullName,
      repo.defaultBranch || 'main',
      get().githubToken
    );
    const created = await get().createProject(repo.name, 'custom', 'github', fileMap);
    const nextProjects = get().projects.map((p) =>
      p.id === created.id ? { ...p, githubRepoUrl: repo.htmlUrl } : p
    );
    set({ projects: nextProjects });
    await StorageService.setItem(STORAGE_KEYS.projects, nextProjects);
    return created;
  },

  installPlugin: async (pluginId) => {
    const now = Date.now();
    const existing = get().pluginStates[pluginId];
    const nextStates: Record<string, PluginState> = {
      ...get().pluginStates,
      [pluginId]: {
        pluginId,
        installed: true,
        enabled: true,
        grantedPermissions: existing?.grantedPermissions || ['editor:read', 'command:register'],
        installedAt: now,
        updatedAt: now,
      },
    };
    set({ pluginStates: nextStates });
    await StorageService.setItem(STORAGE_KEYS.pluginStates, nextStates);
    get().pushToast('success', 'Plugin installed');
  },

  uninstallPlugin: async (pluginId) => {
    const nextStates: Record<string, PluginState> = {
      ...get().pluginStates,
      [pluginId]: {
        pluginId,
        installed: false,
        enabled: false,
        grantedPermissions: [],
        installedAt: 0,
        updatedAt: Date.now(),
      },
    };
    set({ pluginStates: nextStates });
    await StorageService.setItem(STORAGE_KEYS.pluginStates, nextStates);
    get().pushToast('info', 'Plugin uninstalled');
  },

  togglePluginEnabled: async (pluginId) => {
    const curr = get().pluginStates[pluginId];
    if (!curr || !curr.installed) return;
    const nextStates: Record<string, PluginState> = {
      ...get().pluginStates,
      [pluginId]: { ...curr, enabled: !curr.enabled, updatedAt: Date.now() },
    };
    set({ pluginStates: nextStates });
    await StorageService.setItem(STORAGE_KEYS.pluginStates, nextStates);
  },

  togglePluginPermission: async (pluginId, perm) => {
    const curr = get().pluginStates[pluginId];
    if (!curr) return;
    const has = curr.grantedPermissions.includes(perm);
    const nextPerms = has
      ? curr.grantedPermissions.filter((p) => p !== perm)
      : [...curr.grantedPermissions, perm];
    const nextStates: Record<string, PluginState> = {
      ...get().pluginStates,
      [pluginId]: { ...curr, grantedPermissions: nextPerms, updatedAt: Date.now() },
    };
    set({ pluginStates: nextStates });
    await StorageService.setItem(STORAGE_KEYS.pluginStates, nextStates);
  },

  probeToolchains: async () => {
    set({ toolchainsLoading: true });
    try {
      const res = await fetch('/api/toolchains');
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; toolchains: ToolchainInfo[] };
        if (data.ok) {
          set({ toolchains: data.toolchains, toolchainsLoading: false });
          return;
        }
      }
    } catch {
      // Offline fallback metadata
    }

    set({
      toolchainsLoading: false,
      toolchains: [
        {
          id: 'nodejs',
          name: 'Node.js & npm',
          binaryName: 'node',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install nodejs-lts',
          installNotes: 'Install via Termux or Android ARM64 toolchain package',
        },
        {
          id: 'python',
          name: 'Python 3',
          binaryName: 'python3',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install python',
          installNotes: 'Python 3 ARM64 runtime',
        },
        {
          id: 'java',
          name: 'Java (OpenJDK)',
          binaryName: 'javac',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install openjdk-17',
          installNotes: 'OpenJDK 17 compiler and runtime',
        },
        {
          id: 'kotlin',
          name: 'Kotlin Compiler',
          binaryName: 'kotlinc',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install kotlin',
          installNotes: 'Kotlin command-line compiler',
        },
        {
          id: 'c',
          name: 'C Compiler (Clang)',
          binaryName: 'clang',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install clang',
          installNotes: 'Clang C compiler for ARM64',
        },
        {
          id: 'cpp',
          name: 'C++ Compiler (Clang++)',
          binaryName: 'clang++',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install clang',
          installNotes: 'Clang++ C++ compiler',
        },
        {
          id: 'php',
          name: 'PHP CLI',
          binaryName: 'php',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install php',
          installNotes: 'PHP CLI runtime',
        },
        {
          id: 'rust',
          name: 'Rust (rustc)',
          binaryName: 'rustc',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install rust',
          installNotes: 'Rust compiler and Cargo',
        },
        {
          id: 'go',
          name: 'Go Toolchain',
          binaryName: 'go',
          installed: false,
          version: null,
          binaryPath: null,
          architecture: 'arm64-v8a',
          termuxPackage: 'pkg install golang',
          installNotes: 'Go compiler and toolchain',
        },
      ],
    });
  },

  updateToolchainConfig: (id, customPath, envVars) => {
    set((s) => ({
      toolchains: s.toolchains.map((tc) =>
        tc.id === id ? { ...tc, customPath, envVars } : tc
      ),
    }));
    get().pushToast('success', `Updated ${id} toolchain configuration`);
  },

  setTheme: async (themeId) => {
    const nextSettings: AppSettings = {
      ...get().settings,
      themeId,
      terminal: { ...get().settings.terminal, themeId },
    };
    set({ settings: nextSettings });
    await StorageService.setItem(STORAGE_KEYS.settings, nextSettings);
  },

  saveCustomTheme: async (theme) => {
    const existing = get().customThemes.filter((t) => t.id !== theme.id);
    const nextCustom = [...existing, { ...theme, isCustom: true }];
    set({ customThemes: nextCustom });
    await StorageService.setItem(STORAGE_KEYS.customThemes, nextCustom);
    await get().setTheme(theme.id);
    get().pushToast('success', `Saved theme "${theme.name}"`);
  },

  deleteCustomTheme: async (themeId) => {
    const nextCustom = get().customThemes.filter((t) => t.id !== themeId);
    set({ customThemes: nextCustom });
    await StorageService.setItem(STORAGE_KEYS.customThemes, nextCustom);
    if (get().settings.themeId === themeId) {
      await get().setTheme('dark');
    }
  },

  updateSettings: async (updater) => {
    const nextSettings = updater(get().settings);
    set({ settings: nextSettings });
    await StorageService.setItem(STORAGE_KEYS.settings, nextSettings);
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_APP_SETTINGS });
    await StorageService.setItem(STORAGE_KEYS.settings, DEFAULT_APP_SETTINGS);
    get().pushToast('info', 'Reset settings to defaults');
  },

  createBackup: async (name, type, projectId) => {
    const state = get();
    const targetProjects =
      type === 'project' && projectId
        ? state.projects.filter((p) => p.id === projectId)
        : type === 'settings'
          ? []
          : state.projects;
    const targetFiles =
      type === 'project' && projectId
        ? state.files.filter((f) => f.projectId === projectId)
        : type === 'settings'
          ? []
          : state.files;

    const payload = BackupService.createBackupPayload({
      projects: targetProjects,
      files: targetFiles,
      settings: state.settings,
      customThemes: state.customThemes,
      pluginStates: state.pluginStates,
    });

    const snapshot = BackupService.createSnapshotRecord(name, type, payload, projectId);
    const nextBackups = [snapshot, ...state.backups].slice(0, 15);
    set({ backups: nextBackups });
    await StorageService.setItem(STORAGE_KEYS.backups, nextBackups);
    get().pushToast('success', 'Backup created', name);
    return snapshot;
  },

  restoreBackup: async (snapshotId) => {
    const snap = get().backups.find((b) => b.id === snapshotId);
    if (!snap) return;
    const payload = BackupService.parseBackupJson(snap.payloadJson);
    await get().restoreFromPayload(payload);
  },

  restoreFromPayload: async (payload) => {
    const mergedProjects =
      payload.projects.length > 0 ? payload.projects : get().projects;
    const mergedFiles =
      payload.files.length > 0 ? payload.files : get().files;

    set({
      projects: mergedProjects,
      files: mergedFiles,
      settings: payload.settings || get().settings,
      customThemes: payload.customThemes || get().customThemes,
      pluginStates: payload.pluginStates || get().pluginStates,
      activeProjectId: mergedProjects[0]?.id || null,
    });

    await Promise.all([
      StorageService.setItem(STORAGE_KEYS.projects, mergedProjects),
      StorageService.setItem(STORAGE_KEYS.files, mergedFiles),
      StorageService.setItem(STORAGE_KEYS.settings, payload.settings || get().settings),
      StorageService.setItem(STORAGE_KEYS.customThemes, payload.customThemes || get().customThemes),
      StorageService.setItem(STORAGE_KEYS.pluginStates, payload.pluginStates || get().pluginStates),
    ]);

    get().pushToast('success', 'Workspace restored from backup');
  },

  deleteBackup: async (snapshotId) => {
    const next = get().backups.filter((b) => b.id !== snapshotId);
    set({ backups: next });
    await StorageService.setItem(STORAGE_KEYS.backups, next);
  },
}));
