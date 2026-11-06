import React from 'react';
import {
  Command,
  FolderGit2,
  Menu,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import type { ActiveRoute } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';

interface IDEHeaderProps {
  onNewProjectClick: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveRoute; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'editor', label: 'Editor' },
  { id: 'projects', label: 'Projects' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'preview', label: 'Preview' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'github', label: 'GitHub' },
];

export const IDEHeader: React.FC<IDEHeaderProps> = ({ onNewProjectClick }) => {
  const theme = useIDETheme();
  const activeRoute = useIDEStore((s) => s.activeRoute);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const sidebarOpen = useIDEStore((s) => s.sidebarOpen);
  const setSidebarOpen = useIDEStore((s) => s.setSidebarOpen);
  const projects = useIDEStore((s) => s.projects);
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const openProject = useIDEStore((s) => s.openProject);
  const setCommandPaletteOpen = useIDEStore((s) => s.setCommandPaletteOpen);

  return (
    <header
      className="h-12 shrink-0 flex items-center justify-between gap-4 px-3 md:px-5 border-b select-none z-30"
      style={{
        backgroundColor: theme.ui.bgSecondary,
        borderColor: theme.ui.border,
        color: theme.ui.textPrimary,
      }}
    >
      {/* Zone 1: Brand & Active Project Selector */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle workspace sidebar"
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-500/10 transition-colors shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('home')}
          className="flex items-center gap-2 text-base font-bold tracking-tight whitespace-nowrap shrink-0 hover:opacity-85 transition-opacity"
        >
          <FolderGit2 className="w-4 h-4 shrink-0" style={{ color: theme.ui.accent }} />
          <span>CodeX Studio</span>
        </button>

        {projects.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-500/20">
            <select
              aria-label="Active Project"
              value={activeProjectId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  openProject(e.target.value, activeRoute === 'editor');
                }
              }}
              className="text-xs font-medium bg-transparent py-1 pr-2 rounded focus:outline-none max-w-[165px] truncate cursor-pointer"
              style={{ color: theme.ui.textSecondary }}
            >
              {projects.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  style={{
                    backgroundColor: theme.ui.bgSecondary,
                    color: theme.ui.textPrimary,
                  }}
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Zone 2: Clean Single-Line Navigation Links */}
      <nav
        aria-label="Primary Workspace Navigation"
        className="hidden lg:flex items-center gap-5 h-full overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveRoute(item.id)}
              className="relative h-full px-1 text-xs font-medium whitespace-nowrap shrink-0 flex items-center transition-colors"
              style={{
                color: isActive ? theme.ui.textPrimary : theme.ui.textSecondary,
              }}
            >
              <span>{item.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: theme.ui.accent }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Quick Command / Search & Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Command Palette and Search"
          title="Command Palette (Ctrl+P)"
          className="h-9 px-2.5 flex items-center gap-1.5 rounded-lg text-xs border transition-colors hover:bg-slate-500/10 whitespace-nowrap shrink-0"
          style={{
            borderColor: theme.ui.border,
            color: theme.ui.textSecondary,
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Search</span>
          <span className="hidden xl:inline font-mono-code text-[11px] opacity-70">
            <Command className="w-3 h-3 inline -mt-0.5" />P
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('settings')}
          aria-label="IDE Settings"
          title="Settings"
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-500/10 transition-colors shrink-0"
          style={{
            color: activeRoute === 'settings' ? theme.ui.accent : theme.ui.textSecondary,
          }}
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onNewProjectClick}
          className="h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: theme.ui.accent,
            color: theme.ui.accentText,
          }}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>New Project</span>
        </button>
      </div>
    </header>
  );
};
