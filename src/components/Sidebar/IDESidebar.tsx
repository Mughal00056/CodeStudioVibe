import React from 'react';
import {
  Cpu,
  Files,
  GitBranch,
  ListTree,
  Search,
  X,
} from 'lucide-react';
import type { SidebarPanel } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { FileExplorerPanel } from '../FileExplorer/FileExplorerPanel';
import { GlobalSearchPanel } from '../SearchPanel/GlobalSearchPanel';
import { GitSidebarPanel } from '../Sidebar/GitSidebarPanel';
import { ToolchainsSidebarPanel } from '../Sidebar/ToolchainsSidebarPanel';
import { OutlineSidebarPanel } from '../Sidebar/OutlineSidebarPanel';

interface IDESidebarProps {
  onGoToLine?: (line: number) => void;
}

const ACTIVITY_ITEMS: Array<{ id: SidebarPanel; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'explorer', label: 'Explorer', icon: Files },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'git', label: 'Source Control', icon: GitBranch },
  { id: 'toolchains', label: 'Toolchains', icon: Cpu },
  { id: 'outline', label: 'Outline', icon: ListTree },
];

export const IDESidebar: React.FC<IDESidebarProps> = ({ onGoToLine }) => {
  const theme = useIDETheme();
  const sidebarOpen = useIDEStore((s) => s.sidebarOpen);
  const setSidebarOpen = useIDEStore((s) => s.setSidebarOpen);
  const sidebarPanel = useIDEStore((s) => s.sidebarPanel);
  const setSidebarPanel = useIDEStore((s) => s.setSidebarPanel);
  const sidebarWidth = useIDEStore((s) => s.settings.general.sidebarWidth);

  const renderPanelContent = () => {
    switch (sidebarPanel) {
      case 'explorer':
        return <FileExplorerPanel />;
      case 'search':
        return <GlobalSearchPanel onJumpToLine={onGoToLine} />;
      case 'git':
        return <GitSidebarPanel />;
      case 'toolchains':
        return <ToolchainsSidebarPanel />;
      case 'outline':
        return <OutlineSidebarPanel onJumpToLine={onGoToLine} />;
    }
  };

  return (
    <>
      {/* Desktop Activity Rail (Always visible on lg+) */}
      <aside
        aria-label="Activity Bar"
        className="hidden lg:flex flex-col items-center w-12 shrink-0 border-r py-2 gap-1 select-none"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
        }}
      >
        {ACTIVITY_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = sidebarOpen && sidebarPanel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              onClick={() => {
                if (sidebarOpen && sidebarPanel === item.id) {
                  setSidebarOpen(false);
                } else {
                  setSidebarPanel(item.id);
                }
              }}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: active ? theme.ui.bgElevated : 'transparent',
                color: active ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}
      </aside>

      {/* Desktop Collapsible Panel */}
      {sidebarOpen && (
        <aside
          aria-label="Workspace Panel"
          className="hidden lg:flex flex-col shrink-0 border-r overflow-hidden"
          style={{
            width: `${sidebarWidth}px`,
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        >
          {renderPanelContent()}
        </aside>
      )}

      {/* Mobile & Tablet Slide-Over Drawer */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            aria-label="Mobile Workspace Drawer"
            className="w-[84vw] max-w-[320px] h-full flex flex-col border-r shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-12 px-3 flex items-center justify-between border-b shrink-0"
              style={{ borderColor: theme.ui.border }}
            >
              <div className="flex items-center gap-1 overflow-x-auto">
                {ACTIVITY_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = sidebarPanel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSidebarPanel(item.id)}
                      className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
                      style={{
                        backgroundColor: active ? theme.ui.bgElevated : 'transparent',
                        color: active ? theme.ui.accent : theme.ui.textSecondary,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close drawer"
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-500/10 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">{renderPanelContent()}</div>
          </aside>
        </div>
      )}
    </>
  );
};
