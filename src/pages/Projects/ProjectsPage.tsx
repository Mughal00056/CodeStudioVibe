import React, { useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Project } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { FileSystemService } from '../../services/FileSystem';
import { formatRelativeTime } from '../../utils/languageUtils';

export const ProjectsPage: React.FC<{ onOpenNewProjectModal: () => void }> = ({
  onOpenNewProjectModal,
}) => {
  const theme = useIDETheme();
  const projects = useIDEStore((s) => s.projects);
  const files = useIDEStore((s) => s.files);
  const activeProjectId = useIDEStore((s) => s.activeProjectId);

  const createProject = useIDEStore((s) => s.createProject);
  const openProject = useIDEStore((s) => s.openProject);
  const renameProject = useIDEStore((s) => s.renameProject);
  const duplicateProject = useIDEStore((s) => s.duplicateProject);
  const deleteProject = useIDEStore((s) => s.deleteProject);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  const filtered = projects.filter(
    (p) =>
      !query.trim() ||
      p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      p.template.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleOpenFolder = async () => {
    const res = await FileSystemService.openExternalFolder();
    if (res.mode === 'unsupported' || !res.files) {
      pushToast(
        'info',
        'Android SAF & Directory Picker',
        'Select a ZIP archive or grant Android folder access via SAF on native builds.'
      );
      return;
    }
    await createProject(
      res.folderName || 'External Folder',
      'custom',
      res.mode === 'saf' ? 'saf' : 'internal',
      res.files,
      res.treeUri
    );
  };

  return (
    <div
      className="h-full w-full overflow-y-auto px-4 sm:px-6 lg:px-10 py-6"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Projects &amp; Workspaces</h1>
            <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
              Manage internal projects, Android Storage Access Framework folders, and cloned repositories
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenFolder}
              className="h-9 px-3.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
              style={{ borderColor: theme.ui.border }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open SAF Folder</span>
            </button>

            <label
              className="h-9 px-3.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 cursor-pointer"
              style={{ borderColor: theme.ui.border }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import ZIP</span>
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const buf = await file.arrayBuffer();
                  const extracted = await FileSystemService.extractZipArchive(buf);
                  await createProject(file.name.replace(/\.zip$/i, ''), 'custom', 'internal', extracted);
                }}
              />
            </label>

            <button
              type="button"
              onClick={onOpenNewProjectModal}
              className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: theme.ui.textSecondary }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter projects by name or stack..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => {
            const isCurrent = proj.id === activeProjectId;
            const projFiles = files.filter((f) => f.projectId === proj.id && f.type === 'file');

            return (
              <div
                key={proj.id}
                className="rounded-2xl border p-4 flex flex-col justify-between gap-4"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: isCurrent ? theme.ui.accent : theme.ui.border,
                }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold truncate">{proj.name}</h3>
                    <span
                      className="text-[11px] font-mono-code uppercase shrink-0"
                      style={{ color: isCurrent ? theme.ui.accent : theme.ui.textSecondary }}
                    >
                      {proj.template}
                    </span>
                  </div>
                  <p className="text-xs font-mono-code truncate" style={{ color: theme.ui.textSecondary }}>
                    {proj.rootPath}
                  </p>
                  <div className="text-[11px] tabular-nums" style={{ color: theme.ui.textSecondary }}>
                    {projFiles.length} files · {proj.storageType.toUpperCase()} · {formatRelativeTime(proj.updatedAt)}
                  </div>
                </div>

                <div
                  className="pt-3 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: theme.ui.border }}
                >
                  <button
                    type="button"
                    onClick={() => openProject(proj.id, true)}
                    className="h-8 px-3.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                  >
                    Open in Editor
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Rename"
                      onClick={() => {
                        setRenaming(proj);
                        setRenameText(proj.name);
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
                      style={{ color: theme.ui.textSecondary }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate"
                      onClick={() => duplicateProject(proj.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
                      style={{ color: theme.ui.textSecondary }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Export ZIP"
                      onClick={async () => {
                        const allProjEntries = files.filter((f) => f.projectId === proj.id);
                        const blob = await FileSystemService.exportProjectZip(proj.name, allProjEntries);
                        FileSystemService.downloadBlob(blob, `${proj.name.replace(/\s+/g, '_')}.zip`);
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
                      style={{ color: theme.ui.textSecondary }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => setConfirmDelete(proj)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {renaming && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (renameText.trim()) await renameProject(renaming.id, renameText.trim());
              setRenaming(null);
            }}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h3 className="text-sm font-semibold">Rename Project</h3>
            <input
              type="text"
              autoFocus
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border text-xs focus:outline-none"
              style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="h-9 px-3.5 rounded-lg text-xs hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h3 className="text-sm font-semibold">Delete "{confirmDelete.name}"?</h3>
            <p className="text-xs" style={{ color: theme.ui.textSecondary }}>
              This deletes all files in this workspace permanently.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-3.5 rounded-lg text-xs hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteProject(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
