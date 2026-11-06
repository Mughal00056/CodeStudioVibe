import React, { useState } from 'react';
import {
  Code2,
  Eye,
  FolderTree,
  GitBranch,
  Home,
  MoreHorizontal,
  Package,
  Settings,
  TerminalSquare,
  X,
} from 'lucide-react';
import type { ActiveRoute } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';

export const MobileBottomNav: React.FC = () => {
  const theme = useIDETheme();
  const activeRoute = useIDEStore((s) => s.activeRoute);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const setSidebarOpen = useIDEStore((s) => s.setSidebarOpen);
  const setSidebarPanel = useIDEStore((s) => s.setSidebarPanel);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const handleFilesTap = () => {
    setSidebarPanel('explorer');
    setSidebarOpen(true);
    if (activeRoute !== 'editor') {
      setActiveRoute('editor');
    }
  };

  const navigateAndClose = (route: ActiveRoute) => {
    setActiveRoute(route);
    setMoreSheetOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden h-14 pb-safe shrink-0 grid grid-cols-5 items-center border-t z-30 select-none"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
          color: theme.ui.textSecondary,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveRoute('home')}
          className="h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap"
          style={{ color: activeRoute === 'home' ? theme.ui.accent : theme.ui.textSecondary }}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={handleFilesTap}
          className="h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap"
        >
          <FolderTree className="w-5 h-5" />
          <span>Files</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('editor')}
          className="h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap"
          style={{ color: activeRoute === 'editor' ? theme.ui.accent : theme.ui.textSecondary }}
        >
          <Code2 className="w-5 h-5" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveRoute('terminal')}
          className="h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap"
          style={{ color: activeRoute === 'terminal' ? theme.ui.accent : theme.ui.textSecondary }}
        >
          <TerminalSquare className="w-5 h-5" />
          <span>Terminal</span>
        </button>

        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          className="h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap"
          style={{
            color:
              activeRoute === 'preview' ||
              activeRoute === 'plugins' ||
              activeRoute === 'github' ||
              activeRoute === 'projects' ||
              activeRoute === 'settings'
                ? theme.ui.accent
                : theme.ui.textSecondary,
          }}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {moreSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end"
          onClick={() => setMoreSheetOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t p-5 pb-8"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-500/30 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Workspace Tools</h3>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                aria-label="Close workspace tools"
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'preview' as ActiveRoute, label: 'Live Preview', icon: Eye },
                { id: 'projects' as ActiveRoute, label: 'All Projects', icon: FolderTree },
                { id: 'github' as ActiveRoute, label: 'Git & GitHub', icon: GitBranch },
                { id: 'plugins' as ActiveRoute, label: 'Plugins', icon: Package },
                { id: 'settings' as ActiveRoute, label: 'Settings', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateAndClose(item.id)}
                    className="min-h-[48px] px-4 py-3 rounded-xl border flex items-center gap-3 text-xs font-medium text-left transition-colors"
                    style={{
                      backgroundColor: active ? theme.ui.bgElevated : theme.ui.bgPrimary,
                      borderColor: active ? theme.ui.accent : theme.ui.border,
                      color: active ? theme.ui.accent : theme.ui.textPrimary,
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
