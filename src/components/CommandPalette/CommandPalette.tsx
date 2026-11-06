import React, { useMemo, useState } from 'react';
import { Command, FileCode2, Search, X } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { BUILT_IN_THEMES } from '../../themes/themes';

interface CommandPaletteProps {
  onNewProject: () => void;
  onFormatActive: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNewProject,
  onFormatActive,
}) => {
  const theme = useIDETheme();
  const open = useIDEStore((s) => s.commandPaletteOpen);
  const setOpen = useIDEStore((s) => s.setCommandPaletteOpen);
  const files = useIDEStore((s) => s.files);
  const projects = useIDEStore((s) => s.projects);
  const openFileInTab = useIDEStore((s) => s.openFileInTab);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const setBottomTerminalOpen = useIDEStore((s) => s.setBottomTerminalOpen);
  const bottomTerminalOpen = useIDEStore((s) => s.bottomTerminalOpen);
  const setSplitPreviewOpen = useIDEStore((s) => s.setSplitPreviewOpen);
  const splitPreviewOpen = useIDEStore((s) => s.splitPreviewOpen);
  const saveAllTabs = useIDEStore((s) => s.saveAllTabs);
  const setTheme = useIDEStore((s) => s.setTheme);
  const setGoToLineOpen = useIDEStore((s) => s.setGoToLineOpen);

  const [query, setQuery] = useState('');

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const commands = useMemo(
    () => [
      {
        id: 'cmd.newProject',
        label: 'Project: Create New Project',
        action: () => onNewProject(),
      },
      {
        id: 'cmd.saveAll',
        label: 'File: Save All Open Files',
        action: () => saveAllTabs(),
      },
      {
        id: 'cmd.format',
        label: 'Editor: Format Active Document with Prettier',
        action: () => onFormatActive(),
      },
      {
        id: 'cmd.goto',
        label: 'Editor: Go To Line...',
        action: () => setGoToLineOpen(true),
      },
      {
        id: 'cmd.terminal',
        label: 'View: Toggle Bottom Terminal Drawer',
        action: () => setBottomTerminalOpen(!bottomTerminalOpen),
      },
      {
        id: 'cmd.preview',
        label: 'View: Toggle HTML Live Preview',
        action: () => setSplitPreviewOpen(!splitPreviewOpen),
      },
      {
        id: 'cmd.github',
        label: 'Git: Open GitHub & Repositories',
        action: () => setActiveRoute('github'),
      },
      {
        id: 'cmd.plugins',
        label: 'Plugins: Open Plugin Manager',
        action: () => setActiveRoute('plugins'),
      },
      {
        id: 'cmd.settings',
        label: 'Preferences: Open IDE Settings',
        action: () => setActiveRoute('settings'),
      },
      ...Object.values(BUILT_IN_THEMES).map((t) => ({
        id: `cmd.theme.${t.id}`,
        label: `Theme: Switch to ${t.name}`,
        action: () => setTheme(t.id),
      })),
    ],
    [
      onNewProject,
      saveAllTabs,
      onFormatActive,
      setGoToLineOpen,
      setBottomTerminalOpen,
      bottomTerminalOpen,
      setSplitPreviewOpen,
      splitPreviewOpen,
      setActiveRoute,
      setTheme,
    ]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedFiles = files
      .filter((f) => f.type === 'file' && (!q || f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)))
      .slice(0, 12);

    const matchedCmds = commands
      .filter((c) => !q || c.label.toLowerCase().includes(q))
      .slice(0, 10);

    return { matchedFiles, matchedCmds };
  }, [query, files, commands]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
          color: theme.ui.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-3.5 py-2.5 border-b flex items-center gap-2.5"
          style={{ borderColor: theme.ui.border }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: theme.ui.accent }} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="Search files across projects or run an IDE command..."
            className="flex-1 bg-transparent text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close Command Palette"
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3 text-xs">
          {filtered.matchedFiles.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold" style={{ color: theme.ui.textSecondary }}>
                Workspace Files
              </div>
              {filtered.matchedFiles.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    openFileInTab(f.projectId, f.path, true);
                    setOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-500/10 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
                    <span className="truncate font-medium">{f.path}</span>
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: theme.ui.textSecondary }}>
                    {projectMap.get(f.projectId) || 'Project'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filtered.matchedCmds.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold" style={{ color: theme.ui.textSecondary }}>
                IDE Commands
              </div>
              {filtered.matchedCmds.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    cmd.action();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-500/10 text-left"
                >
                  <Command className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.textSecondary }} />
                  <span className="truncate">{cmd.label}</span>
                </button>
              ))}
            </div>
          )}

          {filtered.matchedFiles.length === 0 && filtered.matchedCmds.length === 0 && (
            <div className="py-6 text-center" style={{ color: theme.ui.textSecondary }}>
              No matching files or commands.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
