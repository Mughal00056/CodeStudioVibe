import React, { useState } from 'react';
import { CheckCircle2, FolderOpen, Upload, X } from 'lucide-react';
import type { ProjectTemplateId } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { PROJECT_TEMPLATES } from '../../utils/projectTemplates';
import { FileSystemService } from '../../services/FileSystem';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ open, onClose }) => {
  const theme = useIDETheme();
  const createProject = useIDEStore((s) => s.createProject);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateId>('html');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Web' | 'App' | 'Backend' | 'Starter'>('All');

  if (!open) return null;

  const filteredTemplates = PROJECT_TEMPLATES.filter(
    (t) => categoryFilter === 'All' || t.category === categoryFilter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const spec = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate);
    const projectName = name.trim() || spec?.name || 'New Project';
    await createProject(projectName, selectedTemplate, 'internal');
    setName('');
    onClose();
  };

  const handleOpenExternalFolder = async () => {
    const res = await FileSystemService.openExternalFolder();
    if (res.mode === 'unsupported' || !res.files) {
      pushToast(
        'info',
        'Use ZIP Import or Folder Picker',
        'Android SAF is active on native APK builds; in browser preview, import a ZIP archive below.'
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
          color: theme.ui.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.ui.border }}
        >
          <div>
            <h2 className="text-base font-semibold">Create New Project</h2>
            <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
              Choose a project template or open an existing directory
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-1.5" htmlFor="new-project-name">
              Project Name
            </label>
            <input
              id="new-project-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile Commerce App"
              className="w-full h-10 px-3 rounded-lg border text-sm focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold">Project Template</span>
              <div
                className="flex items-center p-0.5 rounded-lg border text-xs"
                style={{
                  backgroundColor: theme.ui.bgPrimary,
                  borderColor: theme.ui.border,
                }}
              >
                {(['All', 'Web', 'App', 'Backend', 'Starter'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className="px-2.5 py-1 rounded-md font-medium whitespace-nowrap"
                    style={{
                      backgroundColor:
                        categoryFilter === cat ? theme.ui.bgElevated : 'transparent',
                      color:
                        categoryFilter === cat ? theme.ui.accent : theme.ui.textSecondary,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTemplates.map((tpl) => {
                const selected = tpl.id === selectedTemplate;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className="p-3.5 rounded-xl border text-left transition-colors flex flex-col justify-between gap-2"
                    style={{
                      backgroundColor: selected ? theme.ui.bgElevated : theme.ui.bgPrimary,
                      borderColor: selected ? theme.ui.accent : theme.ui.border,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{tpl.name}</span>
                      <span
                        className="text-[11px] font-mono-code"
                        style={{ color: selected ? theme.ui.accent : theme.ui.textSecondary }}
                      >
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: theme.ui.textSecondary }}>
                      {tpl.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="pt-3 border-t flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: theme.ui.border }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenExternalFolder}
                className="h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
                style={{ borderColor: theme.ui.border }}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open SAF Folder</span>
              </button>

              <label
                className="h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 cursor-pointer"
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
                    const baseName = file.name.replace(/\.zip$/i, '');
                    await createProject(baseName, 'custom', 'internal', extracted);
                    onClose();
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg text-xs font-medium hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Create Project
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const GoToLineModal: React.FC<{
  onJump: (line: number) => void;
}> = ({ onJump }) => {
  const theme = useIDETheme();
  const open = useIDEStore((s) => s.goToLineOpen);
  const setOpen = useIDEStore((s) => s.setGoToLineOpen);
  const [lineInput, setLineInput] = useState('1');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-24 p-4"
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const num = parseInt(lineInput, 10);
          if (!Number.isNaN(num) && num >= 1) {
            onJump(num);
          }
          setOpen(false);
        }}
        className="w-full max-w-xs rounded-2xl border p-4 space-y-3 shadow-2xl"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
          color: theme.ui.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xs font-semibold">Go To Line</h3>
        <input
          type="number"
          min={1}
          autoFocus
          value={lineInput}
          onChange={(e) => setLineInput(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border text-xs font-mono-code focus:outline-none"
          style={{
            backgroundColor: theme.ui.bgPrimary,
            borderColor: theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-8 px-3 rounded-lg text-xs hover:bg-slate-500/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-8 px-3.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
          >
            Jump
          </button>
        </div>
      </form>
    </div>
  );
};

export const SaveAsModal: React.FC<{
  open: boolean;
  initialPath: string;
  onClose: () => void;
  onConfirm: (newPath: string) => void;
}> = ({ open, initialPath, onClose, onConfirm }) => {
  const theme = useIDETheme();
  const [pathVal, setPathVal] = useState(initialPath);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pathVal.trim()) {
            onConfirm(pathVal.trim());
          }
          onClose();
        }}
        className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
          color: theme.ui.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold">Save File As</h3>
        <input
          type="text"
          autoFocus
          value={pathVal}
          onChange={(e) => setPathVal(e.target.value)}
          placeholder="e.g. src/copy.ts"
          className="w-full h-10 px-3 rounded-lg border text-xs font-mono-code focus:outline-none"
          style={{
            backgroundColor: theme.ui.bgPrimary,
            borderColor: theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg text-xs hover:bg-slate-500/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
          >
            Save Copy
          </button>
        </div>
      </form>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const theme = useIDETheme();
  const toasts = useIDEStore((s) => s.toasts);
  const dismissToast = useIDEStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-9 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl border p-3 shadow-xl flex items-start justify-between gap-2.5 text-xs"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor:
              t.type === 'error'
                ? '#EF4444'
                : t.type === 'warning'
                  ? '#F59E0B'
                  : theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        >
          <div className="flex items-start gap-2 min-w-0">
            <CheckCircle2
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{
                color:
                  t.type === 'error'
                    ? '#F87171'
                    : t.type === 'warning'
                      ? '#FBBF24'
                      : theme.ui.accent,
              }}
            />
            <div className="min-w-0">
              <div className="font-semibold">{t.title}</div>
              {t.detail && (
                <div className="text-[11px] mt-0.5 break-words" style={{ color: theme.ui.textSecondary }}>
                  {t.detail}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-500/10 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
