import React, { useState } from 'react';
import { ChevronDown, FileCode2, RotateCcw, X } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';

interface EditorTabsBarProps {
  onSaveAsRequest: () => void;
}

export const EditorTabsBar: React.FC<EditorTabsBarProps> = ({ onSaveAsRequest }) => {
  const theme = useIDETheme();
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const closedTabs = useIDEStore((s) => s.closedTabs);
  const setActiveTab = useIDEStore((s) => s.setActiveTab);
  const closeTab = useIDEStore((s) => s.closeTab);
  const closeOtherTabs = useIDEStore((s) => s.closeOtherTabs);
  const closeAllTabs = useIDEStore((s) => s.closeAllTabs);
  const reopenClosedTab = useIDEStore((s) => s.reopenClosedTab);
  const saveTab = useIDEStore((s) => s.saveTab);
  const saveAllTabs = useIDEStore((s) => s.saveAllTabs);

  const [tabMenuOpen, setTabMenuOpen] = useState(false);

  return (
    <div
      className="h-9 shrink-0 flex items-center justify-between border-b select-none relative"
      style={{
        backgroundColor: theme.ui.bgSecondary,
        borderColor: theme.ui.border,
      }}
    >
      <div className="flex-1 flex items-center h-full overflow-x-auto">
        {openTabs.length === 0 ? (
          <div className="px-3 text-xs" style={{ color: theme.ui.textSecondary }}>
            No open files
          </div>
        ) : (
          openTabs.map((tab) => {
            const active = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="group relative h-full min-w-[110px] max-w-[200px] px-3 flex items-center justify-between gap-2 border-r text-xs cursor-pointer shrink-0 transition-colors"
                style={{
                  backgroundColor: active ? theme.editor.background : 'transparent',
                  borderColor: theme.ui.border,
                  color: active ? theme.ui.textPrimary : theme.ui.textSecondary,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileCode2
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: active ? theme.ui.accent : theme.ui.textSecondary }}
                  />
                  <span className="truncate font-medium">{tab.name}</span>
                  {tab.isDirty && (
                    <span
                      title="Unsaved changes"
                      className="text-[10px] font-mono-code font-semibold shrink-0"
                      style={{ color: theme.ui.accent }}
                    >
                      M
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={`Close ${tab.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="h-5 w-5 rounded flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-slate-500/15 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>

                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: theme.ui.accent }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tab Management Dropdown */}
      <div className="flex items-center gap-1 px-1.5 shrink-0 border-l h-full" style={{ borderColor: theme.ui.border }}>
        {closedTabs.length > 0 && (
          <button
            type="button"
            title="Reopen Closed Tab (Ctrl+Shift+T)"
            aria-label="Reopen Closed Tab"
            onClick={reopenClosedTab}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-500/10"
            style={{ color: theme.ui.textSecondary }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          aria-label="Tab options"
          onClick={() => setTabMenuOpen(!tabMenuOpen)}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-500/10"
          style={{ color: theme.ui.textSecondary }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {tabMenuOpen && (
        <div
          className="absolute right-2 top-9 z-30 w-48 rounded-xl border shadow-xl py-1.5 text-xs"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        >
          {activeTabId && (
            <>
              <button
                type="button"
                onClick={() => {
                  setTabMenuOpen(false);
                  saveTab(activeTabId);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
              >
                Save Active Tab
              </button>
              <button
                type="button"
                onClick={() => {
                  setTabMenuOpen(false);
                  onSaveAsRequest();
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
              >
                Save As...
              </button>
              <button
                type="button"
                onClick={() => {
                  setTabMenuOpen(false);
                  closeTab(activeTabId);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
              >
                Close Tab
              </button>
              <button
                type="button"
                onClick={() => {
                  setTabMenuOpen(false);
                  closeOtherTabs(activeTabId);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
              >
                Close Other Tabs
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setTabMenuOpen(false);
              saveAllTabs();
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
          >
            Save All Open Files
          </button>
          <button
            type="button"
            onClick={() => {
              setTabMenuOpen(false);
              closeAllTabs();
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
          >
            Close All Tabs
          </button>
          {closedTabs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTabMenuOpen(false);
                reopenClosedTab();
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-500/10"
            >
              Reopen Closed Tab
            </button>
          )}
        </div>
      )}
    </div>
  );
};
