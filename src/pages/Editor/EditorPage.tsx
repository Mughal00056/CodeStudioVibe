import React, { useRef, useState } from 'react';
import { FilePlus2, FolderOpen } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { CodeEditor } from '../../editor/CodeEditor';
import type { EditorCommandHandle } from '../../editor/EditorExtensions';
import { EditorTabsBar } from '../../components/EditorTabs/EditorTabsBar';
import { EditorToolbar } from '../../components/EditorToolbar/EditorToolbar';
import { EditorSearchBar } from '../../components/SearchPanel/EditorSearchBar';
import { LivePreviewPanel } from '../../components/Preview/LivePreviewPanel';
import { TerminalWorkspace } from '../../components/Terminal/TerminalWorkspace';
import { EditorContextMenu } from '../../components/ContextMenu/EditorContextMenu';
import { GoToLineModal, SaveAsModal } from '../../components/Dialogs/IDEModals';
import { TerminalService } from '../../services/TerminalService';

export const EditorPage: React.FC<{ onNewProject: () => void }> = ({ onNewProject }) => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const editorSettings = useIDEStore((s) => s.settings.editor);
  const bottomTerminalOpen = useIDEStore((s) => s.bottomTerminalOpen);
  const setBottomTerminalOpen = useIDEStore((s) => s.setBottomTerminalOpen);
  const splitPreviewOpen = useIDEStore((s) => s.splitPreviewOpen);
  const setSplitPreviewOpen = useIDEStore((s) => s.setSplitPreviewOpen);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const setGoToLineOpen = useIDEStore((s) => s.setGoToLineOpen);
  const createFile = useIDEStore((s) => s.createFile);

  const updateTabContent = useIDEStore((s) => s.updateTabContent);
  const updateTabCursor = useIDEStore((s) => s.updateTabCursor);
  const saveTab = useIDEStore((s) => s.saveTab);
  const saveTabAs = useIDEStore((s) => s.saveTabAs);
  const formatTabWithPrettier = useIDEStore((s) => s.formatTabWithPrettier);
  const pushToast = useIDEStore((s) => s.pushToast);

  const editorRef = useRef<EditorCommandHandle | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchReplaceMode, setSearchReplaceMode] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;

  const handleRunActiveFile = async () => {
    if (!activeTab) return;
    await saveTab(activeTab.id);

    const ext = activeTab.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'html' || ext === 'htm' || ext === 'css' || ext === 'svg') {
      if (window.innerWidth >= 1024) {
        setSplitPreviewOpen(true);
      } else {
        setActiveRoute('preview');
      }
      return;
    }

    const commandMap: Record<string, string> = {
      js: `node "${activeTab.path}"`,
      mjs: `node "${activeTab.path}"`,
      cjs: `node "${activeTab.path}"`,
      py: `python3 "${activeTab.path}"`,
      sh: `bash "${activeTab.path}"`,
      php: `php "${activeTab.path}"`,
      go: `go run "${activeTab.path}"`,
      rb: `ruby "${activeTab.path}"`,
    };

    const runCmd = commandMap[ext];
    setBottomTerminalOpen(true);

    if (!runCmd) {
      pushToast(
        'info',
        `Opened Terminal for ${activeTab.name}`,
        `Compile or execute ${activeTab.language.toUpperCase()} using an installed toolchain.`
      );
      return;
    }

    setTimeout(async () => {
      const state = useIDEStore.getState();
      const sess = state.terminalSessions.find((s) => s.id === state.activeTerminalId);
      if (sess) {
        await TerminalService.executeCommand(
          sess.runtimeMode,
          sess.id,
          activeTab.projectId,
          runCmd,
          80,
          24
        );
      }
    }, 180);
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        backgroundColor: theme.editor.background,
        color: theme.ui.textPrimary,
      }}
    >
      <EditorTabsBar onSaveAsRequest={() => setSaveAsOpen(true)} />

      <EditorToolbar
        editorRef={editorRef}
        onToggleFindReplace={(showReplace) => {
          setSearchReplaceMode(showReplace);
          setSearchOpen(true);
        }}
        onRunActiveFile={handleRunActiveFile}
        onOpenSaveAs={() => setSaveAsOpen(true)}
      />

      {searchOpen && (
        <EditorSearchBar
          editorRef={editorRef}
          initialShowReplace={searchReplaceMode}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* Main Editor + Optional Split Live Preview */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {activeTab ? (
            <CodeEditor
              ref={editorRef}
              tabId={activeTab.id}
              value={activeTab.content}
              language={activeTab.language}
              theme={theme}
              settings={editorSettings}
              onChange={(val) => updateTabContent(activeTab.id, val)}
              onCursorChange={(line, col, selLen) =>
                updateTabCursor(activeTab.id, line, col, selLen)
              }
              onSaveShortcut={() => {
                saveTab(activeTab.id);
                pushToast('success', `Saved ${activeTab.name}`);
              }}
              onFormatShortcut={() => formatTabWithPrettier(activeTab.id)}
              onContextMenuRequest={(coords) => setContextMenuPos(coords)}
            />
          ) : (
            <div
              className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-4"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                color: theme.ui.textSecondary,
              }}
            >
              <div className="space-y-1 max-w-sm">
                <h2 className="text-sm font-semibold" style={{ color: theme.ui.textPrimary }}>
                  No File Open in Editor
                </h2>
                <p className="text-xs leading-relaxed">
                  Select a file from the Explorer sidebar, create a new file, or open a project workspace.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {activeProjectId && (
                  <button
                    type="button"
                    onClick={() => createFile(activeProjectId, '', 'untitled.js', '// New file\n')}
                    className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>New File</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNewProject}
                  className="h-9 px-4 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
                  style={{ borderColor: theme.ui.border, color: theme.ui.textPrimary }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Split HTML Preview Pane */}
        {splitPreviewOpen && (
          <div
            className="hidden lg:flex w-[44%] min-w-[340px] max-w-[680px] h-full border-l shrink-0"
            style={{ borderColor: theme.ui.border }}
          >
            <LivePreviewPanel onCloseSplit={() => setSplitPreviewOpen(false)} />
          </div>
        )}
      </div>

      {/* Resizable / Collapsible Bottom Terminal Drawer */}
      {bottomTerminalOpen && (
        <div
          className="h-60 sm:h-64 border-t shrink-0"
          style={{ borderColor: theme.ui.border }}
        >
          <TerminalWorkspace
            compactMode
            onCloseDrawer={() => setBottomTerminalOpen(false)}
          />
        </div>
      )}

      <EditorContextMenu
        position={contextMenuPos}
        editorRef={editorRef}
        onFormat={() => activeTab && formatTabWithPrettier(activeTab.id)}
        onGoToLine={() => setGoToLineOpen(true)}
        onClose={() => setContextMenuPos(null)}
      />

      <GoToLineModal onJump={(line) => editorRef.current?.goToLine(line)} />

      <SaveAsModal
        open={saveAsOpen}
        initialPath={activeTab?.path || 'untitled.txt'}
        onClose={() => setSaveAsOpen(false)}
        onConfirm={(newPath) => {
          if (activeTab) saveTabAs(activeTab.id, newPath);
        }}
      />
    </div>
  );
};
