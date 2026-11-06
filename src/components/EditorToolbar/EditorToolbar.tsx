import React, { useState } from 'react';
import {
  Eye,
  MoreVertical,
  Play,
  Redo2,
  Replace,
  Save,
  Search,
  Undo2,
  Wand2,
} from 'lucide-react';
import type { EditorCommandHandle } from '../../editor/EditorExtensions';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { PluginService } from '../../services/PluginService';
import { FileSystemService } from '../../services/FileSystem';

interface EditorToolbarProps {
  editorRef: React.RefObject<EditorCommandHandle | null>;
  onToggleFindReplace: (showReplace: boolean) => void;
  onRunActiveFile: () => void;
  onOpenSaveAs: () => void;
}

const MOBILE_ACCESSORY_KEYS = [
  { label: 'Tab', insert: '  ' },
  { label: '{ }', insert: '{}' },
  { label: '( )', insert: '()' },
  { label: '[ ]', insert: '[]' },
  { label: '< >', insert: '<>' },
  { label: ';', insert: ';' },
  { label: "'", insert: "'" },
  { label: '"', insert: '"' },
  { label: '=', insert: ' = ' },
  { label: '/', insert: '/' },
  { label: '=>', insert: ' => ' },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editorRef,
  onToggleFindReplace,
  onRunActiveFile,
  onOpenSaveAs,
}) => {
  const theme = useIDETheme();
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const saveTab = useIDEStore((s) => s.saveTab);
  const formatTabWithPrettier = useIDEStore((s) => s.formatTabWithPrettier);
  const updateTabContent = useIDEStore((s) => s.updateTabContent);
  const settings = useIDEStore((s) => s.settings);
  const updateSettings = useIDEStore((s) => s.updateSettings);
  const splitPreviewOpen = useIDEStore((s) => s.splitPreviewOpen);
  const setSplitPreviewOpen = useIDEStore((s) => s.setSplitPreviewOpen);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const setGoToLineOpen = useIDEStore((s) => s.setGoToLineOpen);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [moreOpen, setMoreOpen] = useState(false);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;

  const handlePreviewClick = () => {
    if (window.innerWidth >= 1024) {
      setSplitPreviewOpen(!splitPreviewOpen);
    } else {
      setActiveRoute('preview');
    }
  };

  const handleEmmetExpand = () => {
    if (!activeTab || !editorRef.current) return;
    const sel = editorRef.current.getSelectionText().trim();
    const target = sel || 'div.card>h2+p';
    const expanded = PluginService.expandEmmet(target);
    if (expanded) {
      editorRef.current.replaceSelectionText(expanded);
      pushToast('success', 'Expanded Emmet abbreviation');
    } else {
      pushToast('warning', 'Select an Emmet expression such as ul>li*3');
    }
  };

  const handleRunLinter = () => {
    if (!activeTab) return;
    const issues = PluginService.runESLintAnalysis(activeTab.content);
    if (issues.length === 0) {
      pushToast('success', 'ESLint: 0 problems found');
    } else {
      const first = issues[0];
      pushToast(
        'warning',
        `ESLint: ${issues.length} issue(s)`,
        `Line ${first.line}: ${first.message} (${first.rule})`
      );
      editorRef.current?.goToLine(first.line);
    }
  };

  const handleInsertMarkdownTOC = () => {
    if (!activeTab) return;
    const toc = PluginService.generateMarkdownTOC(activeTab.content);
    updateTabContent(activeTab.id, toc + activeTab.content);
    pushToast('success', 'Inserted Markdown Table of Contents');
  };

  return (
    <div
      className="shrink-0 border-b select-none relative"
      style={{
        backgroundColor: theme.ui.bgSecondary,
        borderColor: theme.ui.border,
        color: theme.ui.textPrimary,
      }}
    >
      {/* Primary Compact Toolbar */}
      <div className="h-10 px-2 flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={!activeTab}
            onClick={() => activeTab && saveTab(activeTab.id)}
            title="Save (Ctrl+S)"
            className="h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 disabled:opacity-40 whitespace-nowrap shrink-0"
            style={{
              color: activeTab?.isDirty ? theme.ui.accent : theme.ui.textPrimary,
            }}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            disabled={!activeTab}
            onClick={() => editorRef.current?.undo()}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 disabled:opacity-40 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={!activeTab}
            onClick={() => editorRef.current?.redo()}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 disabled:opacity-40 shrink-0"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] mx-1 bg-slate-500/20 shrink-0" />

          <button
            type="button"
            disabled={!activeTab}
            onClick={() => onToggleFindReplace(false)}
            title="Find (Ctrl+F)"
            aria-label="Find"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 disabled:opacity-40 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={!activeTab}
            onClick={() => onToggleFindReplace(true)}
            title="Find and Replace"
            aria-label="Replace"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 disabled:opacity-40 shrink-0"
          >
            <Replace className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={!activeTab}
            onClick={() => activeTab && formatTabWithPrettier(activeTab.id)}
            title="Format Document with Prettier (Shift+Alt+F)"
            className="h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Format</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={!activeTab}
            onClick={onRunActiveFile}
            title="Run Active File in Terminal"
            className="h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Run</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewClick}
            title="Toggle HTML Live Preview"
            className="h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 whitespace-nowrap shrink-0"
            style={{
              color: splitPreviewOpen ? theme.ui.accent : theme.ui.textPrimary,
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            aria-label="More editor actions"
            onClick={() => setMoreOpen(!moreOpen)}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 shrink-0"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Keyboard Accessory Row (< 768px) */}
      {activeTab && (
        <div
          className="md:hidden h-9 px-2 flex items-center gap-1 overflow-x-auto border-t"
          style={{
            backgroundColor: theme.ui.bgPrimary,
            borderColor: theme.ui.border,
          }}
        >
          {MOBILE_ACCESSORY_KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => editorRef.current?.insertText(k.insert)}
              className="h-7 min-w-[36px] px-2 rounded border text-xs font-mono-code font-medium shrink-0 active:scale-95"
              style={{
                backgroundColor: theme.ui.bgSecondary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {/* More Options Dropdown */}
      {moreOpen && (
        <div
          className="absolute right-2 top-10 z-30 w-56 rounded-xl border shadow-xl py-1.5 text-xs"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
            color: theme.ui.textPrimary,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setGoToLineOpen(true);
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Go To Line... (Ctrl+G)
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.toggleComment();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Toggle Line Comment
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.toggleBlockComment();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Toggle Block Comment
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.duplicateLine();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Duplicate Line
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.deleteLine();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Delete Line
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.selectLine();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Select Current Line
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.selectAll();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Select All
          </button>

          <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              updateSettings((s) => ({
                ...s,
                editor: { ...s.editor, wordWrap: !s.editor.wordWrap },
              }));
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10 flex items-center justify-between"
          >
            <span>Word Wrap</span>
            <span className="font-mono-code opacity-75">
              {settings.editor.wordWrap ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.foldAll();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Fold All Code Blocks
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              editorRef.current?.unfoldAll();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Unfold All Code Blocks
          </button>

          <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              handleEmmetExpand();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Emmet: Expand Abbreviation
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              handleRunLinter();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            ESLint: Analyze File
          </button>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              handleInsertMarkdownTOC();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Markdown: Insert TOC
          </button>

          <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              onOpenSaveAs();
            }}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
          >
            Save As...
          </button>
          {activeTab && (
            <button
              type="button"
              onClick={async () => {
                setMoreOpen(false);
                await FileSystemService.shareOrDownloadFile(activeTab.name, activeTab.content);
                pushToast('success', `Exported ${activeTab.name}`);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
            >
              Share / Download File
            </button>
          )}
        </div>
      )}
    </div>
  );
};
