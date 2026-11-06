import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileCode2,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Info,
  MoreVertical,
  RefreshCw,
  Scissors,
  Share2,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import type { VirtualFile } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { FileSystemService } from '../../services/FileSystem';
import { formatBytes, formatRelativeTime, isValidEntryName } from '../../utils/languageUtils';

export const FileExplorerPanel: React.FC = () => {
  const theme = useIDETheme();
  const projects = useIDEStore((s) => s.projects);
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const allFiles = useIDEStore((s) => s.files);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const fileSettings = useIDEStore((s) => s.settings.fileManager);
  const updateSettings = useIDEStore((s) => s.updateSettings);

  const openFileInTab = useIDEStore((s) => s.openFileInTab);
  const createFile = useIDEStore((s) => s.createFile);
  const createFolder = useIDEStore((s) => s.createFolder);
  const renameEntry = useIDEStore((s) => s.renameEntry);
  const deleteEntries = useIDEStore((s) => s.deleteEntries);
  const copyOrMoveEntries = useIDEStore((s) => s.copyOrMoveEntries);
  const importFilesMap = useIDEStore((s) => s.importFilesMap);
  const refreshProjectFromServer = useIDEStore((s) => s.refreshProjectFromServer);
  const pushToast = useIDEStore((s) => s.pushToast);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(['src', 'styles', 'scripts']));
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ paths: string[]; mode: 'copy' | 'move' } | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Inline modal states (never using window.prompt / window.confirm)
  const [createModal, setCreateModal] = useState<{ type: 'file' | 'folder'; parent: string } | null>(null);
  const [createInput, setCreateInput] = useState('');
  const [renameModal, setRenameModal] = useState<{ path: string; currentName: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteConfirmPaths, setDeleteConfirmPaths] = useState<string[] | null>(null);
  const [infoEntry, setInfoEntry] = useState<VirtualFile | null>(null);
  const [menuEntryPath, setMenuEntryPath] = useState<string | null>(null);

  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const zipUploadRef = useRef<HTMLInputElement | null>(null);

  const projectFiles = useMemo(() => {
    if (!activeProjectId) return [];
    return allFiles.filter((f) => {
      if (f.projectId !== activeProjectId) return false;
      if (!fileSettings.showHiddenFiles && f.isHidden) return false;
      if (filterQuery.trim()) {
        return f.path.toLowerCase().includes(filterQuery.trim().toLowerCase());
      }
      return true;
    });
  }, [allFiles, activeProjectId, fileSettings.showHiddenFiles, filterQuery]);

  const sortEntries = (entries: VirtualFile[]): VirtualFile[] => {
    const dir = fileSettings.sortDirection === 'asc' ? 1 : -1;
    return [...entries].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      switch (fileSettings.sortBy) {
        case 'size':
          return (a.size - b.size) * dir;
        case 'modified':
          return (a.lastModified - b.lastModified) * dir;
        case 'type': {
          const extA = a.name.split('.').pop() || '';
          const extB = b.name.split('.').pop() || '';
          return extA.localeCompare(extB) * dir || a.name.localeCompare(b.name) * dir;
        }
        case 'name':
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
  };

  const toggleFolder = (folderPath: string) => {
    setSelectedFolder(folderPath);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const togglePathSelection = (p: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !createModal || !isValidEntryName(createInput)) {
      pushToast('warning', 'Invalid name', 'Avoid slashes or empty names.');
      return;
    }
    if (createModal.type === 'file') {
      await createFile(activeProjectId, createModal.parent, createInput.trim());
    } else {
      await createFolder(activeProjectId, createModal.parent, createInput.trim());
      const newFolderPath = createModal.parent
        ? `${createModal.parent}/${createInput.trim()}`
        : createInput.trim();
      setExpandedFolders((prev) => new Set(prev).add(newFolderPath));
    }
    setCreateModal(null);
    setCreateInput('');
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !renameModal || !isValidEntryName(renameInput)) {
      pushToast('warning', 'Invalid entry name');
      return;
    }
    await renameEntry(activeProjectId, renameModal.path, renameInput.trim());
    setRenameModal(null);
    setRenameInput('');
  };

  const handleConfirmDelete = async () => {
    if (!activeProjectId || !deleteConfirmPaths) return;
    await deleteEntries(activeProjectId, deleteConfirmPaths);
    setSelectedPaths(new Set());
    setDeleteConfirmPaths(null);
    pushToast('info', `Deleted ${deleteConfirmPaths.length} item(s)`);
  };

  const handleExportProjectZip = async () => {
    if (!activeProject) return;
    const projEntries = allFiles.filter((f) => f.projectId === activeProject.id);
    const blob = await FileSystemService.exportProjectZip(activeProject.name, projEntries);
    const safeName = activeProject.name.replace(/\s+/g, '_') + '.zip';
    FileSystemService.downloadBlob(blob, safeName);
    pushToast('success', 'Exported ZIP archive', safeName);
  };

  const handleExportSelectionZip = async () => {
    if (!activeProject || selectedPaths.size === 0) return;
    const chosen = allFiles.filter(
      (f) => f.projectId === activeProject.id && selectedPaths.has(f.path)
    );
    const blob = await FileSystemService.createZipFromSelection(chosen);
    FileSystemService.downloadBlob(blob, `${activeProject.name}-selection.zip`);
    pushToast('success', 'Created ZIP from selection');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !activeProjectId) return;
    const map: Record<string, string> = {};
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size <= 1_500_000) {
        map[f.name] = await f.text();
      }
    }
    const count = await importFilesMap(activeProjectId, selectedFolder, map);
    pushToast('success', `Imported ${count} file(s)`);
    e.target.value = '';
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    const buf = await file.arrayBuffer();
    const extracted = await FileSystemService.extractZipArchive(buf);
    const count = await importFilesMap(activeProjectId, selectedFolder, extracted);
    pushToast('success', `Extracted ${count} file(s) from ${file.name}`);
    e.target.value = '';
  };

  const renderTree = (parentPath: string, depth: number): React.ReactNode => {
    const children = sortEntries(
      filterQuery.trim()
        ? depth === 0
          ? projectFiles
          : []
        : projectFiles.filter((f) => f.parentPath === parentPath)
    );

    return children.map((entry) => {
      const isFolder = entry.type === 'folder';
      const isExpanded = expandedFolders.has(entry.path);
      const isActiveFile =
        !isFolder &&
        activeTab?.projectId === activeProjectId &&
        activeTab?.path === entry.path;
      const isChecked = selectedPaths.has(entry.path);
      const isMenuOpen = menuEntryPath === entry.path;

      return (
        <div key={entry.id}>
          <div
            className="group relative flex items-center justify-between min-h-[36px] pr-2 text-xs cursor-pointer select-none transition-colors rounded-md mx-1"
            style={{
              paddingLeft: `${8 + depth * 14}px`,
              backgroundColor: isActiveFile
                ? theme.ui.bgElevated
                : isChecked
                  ? 'rgba(59, 130, 246, 0.12)'
                  : 'transparent',
              color: isActiveFile ? theme.ui.accent : theme.ui.textPrimary,
            }}
            onClick={() => {
              if (multiSelectMode) {
                togglePathSelection(entry.path);
                return;
              }
              if (isFolder) {
                toggleFolder(entry.path);
              } else if (activeProjectId) {
                setSelectedFolder(entry.parentPath);
                openFileInTab(activeProjectId, entry.path, true);
              }
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 py-1">
              {multiSelectMode && (
                <span className="shrink-0" style={{ color: theme.ui.accent }}>
                  {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 opacity-60" />}
                </span>
              )}

              {isFolder ? (
                <>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
                  ) : (
                    <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.textSecondary }} />
                  )}
                </>
              ) : (
                <FileCode2
                  className="w-3.5 h-3.5 shrink-0 ml-4"
                  style={{ color: isActiveFile ? theme.ui.accent : theme.ui.textSecondary }}
                />
              )}

              <span className="truncate font-medium">{entry.name}</span>
            </div>

            <button
              type="button"
              aria-label={`Actions for ${entry.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuEntryPath(isMenuOpen ? null : entry.path);
              }}
              className="h-7 w-7 flex items-center justify-center rounded opacity-75 group-hover:opacity-100 hover:bg-slate-500/15 shrink-0"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-2 top-8 z-30 w-44 rounded-xl border shadow-xl py-1.5 text-xs"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                  color: theme.ui.textPrimary,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {isFolder && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuEntryPath(null);
                        setCreateModal({ type: 'file', parent: entry.path });
                        setCreateInput('');
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>New File Here</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuEntryPath(null);
                        setCreateModal({ type: 'folder', parent: entry.path });
                        setCreateInput('');
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Folder Here</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuEntryPath(null);
                    setRenameModal({ path: entry.path, currentName: entry.name });
                    setRenameInput(entry.name);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuEntryPath(null);
                    setClipboard({ paths: [entry.path], mode: 'copy' });
                    pushToast('info', `Copied ${entry.name}`);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuEntryPath(null);
                    setClipboard({ paths: [entry.path], mode: 'move' });
                    pushToast('info', `Cut ${entry.name}`);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Cut / Move</span>
                </button>

                {!isFolder && (
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuEntryPath(null);
                      const mode = await FileSystemService.shareOrDownloadFile(entry.name, entry.content);
                      pushToast('success', mode === 'shared' ? 'Shared file' : `Downloaded ${entry.name}`);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share / Export</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuEntryPath(null);
                    setInfoEntry(entry);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-500/10 text-left"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>File Properties</span>
                </button>

                <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

                <button
                  type="button"
                  onClick={() => {
                    setMenuEntryPath(null);
                    setDeleteConfirmPaths([entry.path]);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-red-400 hover:bg-red-500/10 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {isFolder && isExpanded && !filterQuery.trim() && renderTree(entry.path, depth + 1)}
        </div>
      );
    });
  };

  if (!activeProject) {
    return (
      <div className="p-4 text-xs" style={{ color: theme.ui.textSecondary }}>
        No active project selected. Create or open a project from Home.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full select-none"
      onClick={() => {
        if (menuEntryPath) setMenuEntryPath(null);
      }}
    >
      {/* Explorer Header */}
      <div
        className="px-3 py-2.5 border-b flex items-center justify-between gap-1 shrink-0"
        style={{ borderColor: theme.ui.border }}
      >
        <span className="text-xs font-semibold truncate">{activeProject.name}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            title="New File"
            aria-label="New File"
            onClick={() => {
              setCreateModal({ type: 'file', parent: selectedFolder });
              setCreateInput('');
            }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-500/10"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="New Folder"
            aria-label="New Folder"
            onClick={() => {
              setCreateModal({ type: 'folder', parent: selectedFolder });
              setCreateInput('');
            }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-500/10"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Multi-Select Files"
            aria-label="Multi-Select Files"
            onClick={() => {
              setMultiSelectMode(!multiSelectMode);
              setSelectedPaths(new Set());
            }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-500/10"
            style={{ color: multiSelectMode ? theme.ui.accent : undefined }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Refresh Files"
            aria-label="Refresh Files"
            onClick={async () => {
              await refreshProjectFromServer(activeProject.id);
              pushToast('info', 'Refreshed workspace tree');
            }}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-500/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter & Quick Tools Row */}
      <div className="p-2 border-b space-y-1.5 shrink-0" style={{ borderColor: theme.ui.border }}>
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter files..."
          className="w-full h-8 px-2.5 rounded-lg text-xs border focus:outline-none"
          style={{
            backgroundColor: theme.ui.bgPrimary,
            borderColor: theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        />

        <div className="flex items-center justify-between gap-1 text-[11px]" style={{ color: theme.ui.textSecondary }}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                updateSettings((prev) => ({
                  ...prev,
                  fileManager: {
                    ...prev.fileManager,
                    showHiddenFiles: !prev.fileManager.showHiddenFiles,
                  },
                }))
              }
              className="px-2 py-1 rounded hover:bg-slate-500/10 flex items-center gap-1"
              title="Toggle hidden dotfiles"
            >
              {fileSettings.showHiddenFiles ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>Hidden</span>
            </button>

            <select
              aria-label="Sort files by"
              value={fileSettings.sortBy}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  fileManager: {
                    ...prev.fileManager,
                    sortBy: e.target.value as 'name' | 'modified' | 'size' | 'type',
                  },
                }))
              }
              className="bg-transparent px-1 py-0.5 rounded focus:outline-none cursor-pointer"
            >
              <option value="name" style={{ backgroundColor: theme.ui.bgSecondary }}>Sort: Name</option>
              <option value="modified" style={{ backgroundColor: theme.ui.bgSecondary }}>Sort: Modified</option>
              <option value="size" style={{ backgroundColor: theme.ui.bgSecondary }}>Sort: Size</option>
              <option value="type" style={{ backgroundColor: theme.ui.bgSecondary }}>Sort: Type</option>
            </select>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Import Files"
              onClick={() => fileUploadRef.current?.click()}
              className="p-1 rounded hover:bg-slate-500/10"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Extract ZIP Archive"
              onClick={() => zipUploadRef.current?.click()}
              className="p-1 rounded hover:bg-slate-500/10"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Export Project ZIP"
              onClick={handleExportProjectZip}
              className="p-1 rounded hover:bg-slate-500/10"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Select or Clipboard Action Bar */}
      {(multiSelectMode && selectedPaths.size > 0) || clipboard ? (
        <div
          className="px-2.5 py-1.5 border-b flex items-center justify-between gap-2 text-[11px] shrink-0"
          style={{ backgroundColor: theme.ui.bgElevated, borderColor: theme.ui.border }}
        >
          {multiSelectMode && selectedPaths.size > 0 ? (
            <>
              <span className="font-medium tabular-nums">{selectedPaths.size} selected</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setClipboard({ paths: Array.from(selectedPaths), mode: 'copy' })
                  }
                  className="px-2 py-1 rounded hover:bg-slate-500/15"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setClipboard({ paths: Array.from(selectedPaths), mode: 'move' })
                  }
                  className="px-2 py-1 rounded hover:bg-slate-500/15"
                >
                  Cut
                </button>
                <button
                  type="button"
                  onClick={handleExportSelectionZip}
                  className="px-2 py-1 rounded hover:bg-slate-500/15"
                >
                  ZIP
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPaths(Array.from(selectedPaths))}
                  className="px-2 py-1 rounded text-red-400 hover:bg-red-500/15"
                >
                  Delete
                </button>
              </div>
            </>
          ) : clipboard ? (
            <>
              <span className="truncate">
                {clipboard.mode === 'copy' ? 'Copy' : 'Move'} {clipboard.paths.length} item(s)
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    await copyOrMoveEntries(
                      activeProject.id,
                      clipboard.paths,
                      selectedFolder,
                      clipboard.mode
                    );
                    setClipboard(null);
                    setMultiSelectMode(false);
                    setSelectedPaths(new Set());
                    pushToast('success', 'Paste completed');
                  }}
                  className="px-2 py-1 rounded font-medium"
                  style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                >
                  Paste Here
                </button>
                <button
                  type="button"
                  onClick={() => setClipboard(null)}
                  className="px-1.5 py-1 rounded hover:bg-slate-500/15"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {projectFiles.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs" style={{ color: theme.ui.textSecondary }}>
            <p className="mb-2">No files match the current filter.</p>
            <button
              type="button"
              onClick={() => {
                setCreateModal({ type: 'file', parent: '' });
                setCreateInput('index.html');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
            >
              Create File
            </button>
          </div>
        ) : (
          renderTree('', 0)
        )}
      </div>

      {/* Hidden File Inputs for Import & ZIP Extraction */}
      <input
        ref={fileUploadRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={zipUploadRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleZipUpload}
      />

      {/* Create File / Folder Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          >
            <div>
              <h3 className="text-sm font-semibold">
                New {createModal.type === 'file' ? 'File' : 'Folder'}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
                Location: /{createModal.parent || 'root'}
              </p>
            </div>
            <input
              type="text"
              autoFocus
              value={createInput}
              onChange={(e) => setCreateInput(e.target.value)}
              placeholder={createModal.type === 'file' ? 'e.g. components/Button.tsx' : 'e.g. utils'}
              className="w-full h-10 px-3 rounded-lg text-xs border focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModal(null)}
                className="h-9 px-3.5 rounded-lg text-xs font-medium hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRenameSubmit}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          >
            <h3 className="text-sm font-semibold">Rename {renameModal.currentName}</h3>
            <input
              type="text"
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full h-10 px-3 rounded-lg text-xs border focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="h-9 px-3.5 rounded-lg text-xs font-medium hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Save Name
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteConfirmPaths && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          >
            <h3 className="text-sm font-semibold">Confirm Deletion</h3>
            <p className="text-xs leading-relaxed" style={{ color: theme.ui.textSecondary }}>
              Delete {deleteConfirmPaths.length} selected item(s)? This removes them from the current project workspace.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPaths(null)}
                className="h-9 px-3.5 rounded-lg text-xs font-medium hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Properties Modal */}
      {infoEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInfoEntry(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-5 space-y-3 shadow-2xl text-xs"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold">{infoEntry.name}</h3>
            <div className="space-y-2 border-t pt-3" style={{ borderColor: theme.ui.border }}>
              <div className="flex justify-between">
                <span style={{ color: theme.ui.textSecondary }}>Path</span>
                <span className="font-mono-code">/{infoEntry.path}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.ui.textSecondary }}>Kind</span>
                <span className="capitalize">{infoEntry.type}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.ui.textSecondary }}>Size</span>
                <span className="tabular-nums">{formatBytes(infoEntry.size)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: theme.ui.textSecondary }}>Modified</span>
                <span>{formatRelativeTime(infoEntry.lastModified)}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoEntry(null)}
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
