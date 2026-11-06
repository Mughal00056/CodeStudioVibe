import React, { useRef, useState } from 'react';
import {
  Archive,
  Code2,
  Copy,
  Download,
  Edit3,
  Eye,
  FileCode2,
  FolderGit2,
  FolderOpen,
  FolderPlus,
  Package,
  Plus,
  Settings,
  TerminalSquare,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Project, ProjectTemplateId } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { PROJECT_TEMPLATES } from '../../utils/projectTemplates';
import { FileSystemService } from '../../services/FileSystem';
import { formatRelativeTime, LANGUAGE_CATALOG } from '../../utils/languageUtils';

interface HomePageProps {
  onOpenNewProjectModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenNewProjectModal }) => {
  const theme = useIDETheme();
  const projects = useIDEStore((s) => s.projects);
  const files = useIDEStore((s) => s.files);
  const recentFiles = useIDEStore((s) => s.recentFiles);
  const githubUser = useIDEStore((s) => s.githubUser);
  const githubRepos = useIDEStore((s) => s.githubRepos);

  const createProject = useIDEStore((s) => s.createProject);
  const openProject = useIDEStore((s) => s.openProject);
  const renameProject = useIDEStore((s) => s.renameProject);
  const duplicateProject = useIDEStore((s) => s.duplicateProject);
  const deleteProject = useIDEStore((s) => s.deleteProject);
  const openFileInTab = useIDEStore((s) => s.openFileInTab);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const cloneGitHubRepository = useIDEStore((s) => s.cloneGitHubRepository);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [cloningRepoId, setCloningRepoId] = useState<number | null>(null);

  const openSingleFileRef = useRef<HTMLInputElement | null>(null);
  const importZipRef = useRef<HTMLInputElement | null>(null);

  const handleQuickTemplate = async (templateId: ProjectTemplateId, label: string) => {
    const count = projects.filter((p) => p.template === templateId).length + 1;
    await createProject(`${label} ${count}`, templateId, 'internal');
  };

  const handleOpenExternalFolder = async () => {
    const res = await FileSystemService.openExternalFolder();
    if (res.mode === 'unsupported' || !res.files) {
      importZipRef.current?.click();
      return;
    }
    await createProject(
      res.folderName || 'External Project',
      'custom',
      res.mode === 'saf' ? 'saf' : 'internal',
      res.files,
      res.treeUri
    );
  };

  const handleOpenSingleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await createProject(file.name.replace(/\.[^.]+$/, '') || 'Scratch File', 'empty', 'internal', {
      [file.name]: text,
    });
    e.target.value = '';
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const extracted = await FileSystemService.extractZipArchive(buf);
    await createProject(file.name.replace(/\.zip$/i, ''), 'custom', 'internal', extracted);
    e.target.value = '';
  };

  const handleExportProject = async (proj: Project) => {
    const projFiles = files.filter((f) => f.projectId === proj.id);
    const blob = await FileSystemService.exportProjectZip(proj.name, projFiles);
    FileSystemService.downloadBlob(blob, `${proj.name.replace(/\s+/g, '_')}.zip`);
    pushToast('success', `Exported ${proj.name}.zip`);
  };

  return (
    <div
      className="h-full w-full overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8 pb-8">
        {/* Hero Workspace Action Header */}
        <section
          className="rounded-2xl border p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
          }}
        >
          <div className="space-y-2 max-w-xl">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              CodeX Studio Mobile &amp; Web IDE
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.ui.textSecondary }}>
              Edit multi-language source trees with CodeMirror 6, run shell commands in xterm.js, inspect responsive HTML previews, and manage Git repositories offline or online.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenNewProjectModal}
              className="h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
              style={{
                backgroundColor: theme.ui.accent,
                color: theme.ui.accentText,
              }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Create New Project</span>
            </button>

            <button
              type="button"
              onClick={handleOpenExternalFolder}
              className="h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 hover:bg-slate-500/10 whitespace-nowrap"
              style={{ borderColor: theme.ui.border }}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Open Project</span>
            </button>

            <button
              type="button"
              onClick={() => openSingleFileRef.current?.click()}
              className="h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 hover:bg-slate-500/10 whitespace-nowrap"
              style={{ borderColor: theme.ui.border }}
            >
              <FileCode2 className="w-4 h-4 shrink-0" />
              <span>Open File</span>
            </button>

            <button
              type="button"
              onClick={() => importZipRef.current?.click()}
              className="h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 hover:bg-slate-500/10 whitespace-nowrap"
              style={{ borderColor: theme.ui.border }}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Import ZIP</span>
            </button>
          </div>
        </section>

        {/* Quick Access Strip */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { label: 'Code Editor', sub: 'CodeMirror 6', route: 'editor' as const, icon: Code2 },
              { label: 'Shell Terminal', sub: 'xterm.js PTY', route: 'terminal' as const, icon: TerminalSquare },
              { label: 'Live Preview', sub: 'HTML / CSS / JS', route: 'preview' as const, icon: Eye },
              { label: 'Git & GitHub', sub: 'Repos & Branches', route: 'github' as const, icon: FolderGit2 },
              { label: 'Plugin Store', sub: 'Extensions & APIs', route: 'plugins' as const, icon: Package },
              { label: 'Settings', sub: 'Themes & Backup', route: 'settings' as const, icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveRoute(item.route)}
                  className="p-3.5 rounded-xl border text-left hover:bg-slate-500/5 transition-colors flex flex-col gap-2"
                  style={{
                    backgroundColor: theme.ui.bgSecondary,
                    borderColor: theme.ui.border,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: theme.ui.accent }} />
                  <div>
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[11px]" style={{ color: theme.ui.textSecondary }}>
                      {item.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent Projects & Recent Files Two-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Recent Projects (7 cols) */}
          <section className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Projects</h2>
              <button
                type="button"
                onClick={() => setActiveRoute('projects')}
                className="text-xs font-medium hover:underline"
                style={{ color: theme.ui.accent }}
              >
                Manage All ({projects.length})
              </button>
            </div>

            {projects.length === 0 ? (
              <div
                className="rounded-xl border p-6 text-center space-y-3"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                }}
              >
                <p className="text-xs" style={{ color: theme.ui.textSecondary }}>
                  No projects in workspace yet. Create one from a template below.
                </p>
                <button
                  type="button"
                  onClick={onOpenNewProjectModal}
                  className="h-9 px-4 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div
                className="rounded-xl border divide-y overflow-hidden"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                }}
              >
                {projects.slice(0, 6).map((proj) => {
                  const fileCount = files.filter(
                    (f) => f.projectId === proj.id && f.type === 'file'
                  ).length;

                  return (
                    <div
                      key={proj.id}
                      className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-500/5 transition-colors"
                      style={{ borderColor: theme.ui.border }}
                    >
                      <button
                        type="button"
                        onClick={() => openProject(proj.id, true)}
                        className="flex-1 min-w-0 text-left space-y-0.5"
                      >
                        <div className="text-xs sm:text-sm font-semibold truncate">
                          {proj.name}
                        </div>
                        <div
                          className="text-[11px] flex items-center gap-1.5 flex-wrap tabular-nums"
                          style={{ color: theme.ui.textSecondary }}
                        >
                          <span className="uppercase">{proj.template}</span>
                          <span aria-hidden="true">·</span>
                          <span>{fileCount} files</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(proj.updatedAt)}</span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Rename Project"
                          aria-label={`Rename ${proj.name}`}
                          onClick={() => {
                            setRenamingProject(proj);
                            setRenameValue(proj.name);
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
                          style={{ color: theme.ui.textSecondary }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate Project"
                          aria-label={`Duplicate ${proj.name}`}
                          onClick={() => duplicateProject(proj.id)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
                          style={{ color: theme.ui.textSecondary }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Export Project ZIP"
                          aria-label={`Export ${proj.name}`}
                          onClick={() => handleExportProject(proj)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
                          style={{ color: theme.ui.textSecondary }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete Project"
                          aria-label={`Delete ${proj.name}`}
                          onClick={() => setDeletingProject(proj)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Files (5 cols) */}
          <section className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-semibold">Recent Files</h2>
            {recentFiles.length === 0 ? (
              <div
                className="rounded-xl border p-6 text-center text-xs"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                  color: theme.ui.textSecondary,
                }}
              >
                Files you edit in CodeMirror will appear here for one-tap access.
              </div>
            ) : (
              <div
                className="rounded-xl border divide-y overflow-hidden"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                }}
              >
                {recentFiles.slice(0, 6).map((rf) => {
                  const langLabel = LANGUAGE_CATALOG[rf.language]?.shortCode || 'TXT';
                  return (
                    <button
                      key={`${rf.projectId}_${rf.filePath}`}
                      type="button"
                      onClick={() => openFileInTab(rf.projectId, rf.filePath, true)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-500/5 transition-colors"
                      style={{ borderColor: theme.ui.border }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{rf.fileName}</div>
                        <div
                          className="text-[11px] truncate"
                          style={{ color: theme.ui.textSecondary }}
                        >
                          {rf.projectName} · {rf.filePath}
                        </div>
                      </div>
                      <span
                        className="font-mono-code text-[11px] shrink-0 tabular-nums"
                        style={{ color: theme.ui.textSecondary }}
                      >
                        {langLabel} · {formatRelativeTime(rf.openedAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Project Templates Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Project Templates</h2>
            <span className="text-xs" style={{ color: theme.ui.textSecondary }}>
              Click any template to scaffold and open immediately
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROJECT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleQuickTemplate(tpl.id, tpl.name)}
                className="p-4 rounded-xl border text-left hover:bg-slate-500/5 transition-colors flex flex-col justify-between gap-2"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 shrink-0" style={{ color: theme.ui.accent }} />
                    <span className="text-xs font-semibold">{tpl.name}</span>
                  </div>
                  <span className="text-[11px] font-mono-code" style={{ color: theme.ui.textSecondary }}>
                    {tpl.category}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: theme.ui.textSecondary }}>
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* GitHub Repositories Quick Section */}
        <section
          className="rounded-2xl border p-5 space-y-4"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">GitHub Repositories</h2>
              <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
                {githubUser
                  ? `Connected as @${githubUser.login} (${githubUser.publicRepos} public repositories)`
                  : 'Connect your GitHub account or search public repositories to clone into CodeX Studio'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute('github')}
              className="h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
            >
              {githubUser ? 'Browse Repositories' : 'Open GitHub Integration'}
            </button>
          </div>

          {githubRepos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {githubRepos.slice(0, 4).map((repo) => (
                <div
                  key={repo.id}
                  className="p-3 rounded-xl border flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: theme.ui.bgPrimary,
                    borderColor: theme.ui.border,
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{repo.fullName}</div>
                    <div className="text-[11px] truncate" style={{ color: theme.ui.textSecondary }}>
                      {repo.language} · {repo.defaultBranch}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={cloningRepoId === repo.id}
                    onClick={async () => {
                      setCloningRepoId(repo.id);
                      try {
                        await cloneGitHubRepository(repo);
                      } finally {
                        setCloningRepoId(null);
                      }
                    }}
                    className="h-8 px-3 rounded-lg border text-xs font-medium shrink-0 hover:bg-slate-500/10"
                    style={{ borderColor: theme.ui.border }}
                  >
                    {cloningRepoId === repo.id ? 'Cloning...' : 'Clone'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Hidden inputs for Open Single File and Import ZIP */}
      <input
        ref={openSingleFileRef}
        type="file"
        className="hidden"
        onChange={handleOpenSingleFile}
      />
      <input
        ref={importZipRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleImportZip}
      />

      {/* Rename Project Modal */}
      {renamingProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (renameValue.trim()) {
                await renameProject(renamingProject.id, renameValue.trim());
              }
              setRenamingProject(null);
            }}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
            }}
          >
            <h3 className="text-sm font-semibold">Rename Project</h3>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border text-xs focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenamingProject(null)}
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

      {/* Confirm Delete Project Modal */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
            }}
          >
            <h3 className="text-sm font-semibold">Delete "{deletingProject.name}"?</h3>
            <p className="text-xs leading-relaxed" style={{ color: theme.ui.textSecondary }}>
              This permanently removes the project and its files from local workspace storage. Consider exporting a ZIP backup first.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="h-9 px-3.5 rounded-lg text-xs hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteProject(deletingProject.id);
                  setDeletingProject(null);
                }}
                className="h-9 px-4 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-500"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
