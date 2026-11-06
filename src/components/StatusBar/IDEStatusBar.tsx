import React from 'react';
import { GitBranch, TerminalSquare } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { LANGUAGE_CATALOG } from '../../utils/languageUtils';

export const IDEStatusBar: React.FC = () => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const gitRepos = useIDEStore((s) => s.gitRepos);
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const editorSettings = useIDEStore((s) => s.settings.editor);
  const bottomTerminalOpen = useIDEStore((s) => s.bottomTerminalOpen);
  const setBottomTerminalOpen = useIDEStore((s) => s.setBottomTerminalOpen);
  const setSidebarPanel = useIDEStore((s) => s.setSidebarPanel);
  const setGoToLineOpen = useIDEStore((s) => s.setGoToLineOpen);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;
  const repo = activeProjectId ? gitRepos[activeProjectId] : undefined;
  const langLabel = activeTab
    ? LANGUAGE_CATALOG[activeTab.language]?.label || activeTab.language
    : 'Plain Text';

  return (
    <footer
      className="hidden md:flex h-7 px-3 border-t items-center justify-between text-[11px] font-mono-code select-none shrink-0"
      style={{
        backgroundColor: theme.ui.bgSecondary,
        borderColor: theme.ui.border,
        color: theme.ui.textSecondary,
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {repo?.initialized && (
          <button
            type="button"
            onClick={() => setSidebarPanel('git')}
            className="flex items-center gap-1 hover:opacity-100 opacity-90"
            style={{ color: theme.ui.textPrimary }}
          >
            <GitBranch className="w-3 h-3" style={{ color: theme.ui.accent }} />
            <span>{repo.currentBranch}</span>
          </button>
        )}

        {activeTab && (
          <span>
            {activeTab.isDirty ? 'Unsaved' : 'Saved'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0 tabular-nums">
        {activeTab && (
          <>
            <button
              type="button"
              onClick={() => setGoToLineOpen(true)}
              className="hover:underline"
              title="Go to Line (Ctrl+G)"
            >
              Ln {activeTab.cursorLine}, Col {activeTab.cursorCol}
              {activeTab.selectionLength > 0 ? ` (${activeTab.selectionLength} sel)` : ''}
            </button>
            <span>Spaces: {editorSettings.tabSize}</span>
            <span>UTF-8</span>
            <span style={{ color: theme.ui.textPrimary }}>{langLabel}</span>
          </>
        )}

        <button
          type="button"
          onClick={() => setBottomTerminalOpen(!bottomTerminalOpen)}
          className="flex items-center gap-1 hover:opacity-100"
          style={{
            color: bottomTerminalOpen ? theme.ui.accent : theme.ui.textSecondary,
          }}
        >
          <TerminalSquare className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>
      </div>
    </footer>
  );
};
