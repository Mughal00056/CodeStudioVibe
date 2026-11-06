import {
  copyLineDown,
  defaultKeymap,
  deleteLine,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  selectAll,
  selectLine,
  toggleBlockComment,
  toggleComment,
  undo,
} from '@codemirror/commands';
import {
  bracketMatching,
  codeFolding,
  foldAll,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  unfoldAll,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import {
  findNext,
  findPrevious,
  highlightSelectionMatches,
  openSearchPanel,
  replaceAll,
  replaceNext,
  search,
  searchKeymap,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import type { EditorSettings } from '../types';

export function buildCoreEditorExtensions(
  settings: EditorSettings,
  onSaveShortcut: () => void,
  onFormatShortcut: () => void
): Extension[] {
  const extensions: Extension[] = [
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    bracketMatching(),
    indentUnit.of(' '.repeat(settings.tabSize)),
    EditorState.tabSize.of(settings.tabSize),
    search({ top: true }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...foldKeymap,
      ...closeBracketsKeymap,
      ...completionKeymap,
      indentWithTab,
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          onSaveShortcut();
          return true;
        },
      },
      {
        key: 'Shift-Alt-f',
        preventDefault: true,
        run: () => {
          onFormatShortcut();
          return true;
        },
      },
    ]),
  ];

  if (settings.lineNumbers) {
    extensions.push(lineNumbers());
  }
  if (settings.wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }
  if (settings.autoIndent) {
    extensions.push(indentOnInput());
  }
  if (settings.bracketClosing) {
    extensions.push(closeBrackets());
  }
  if (settings.codeFolding) {
    extensions.push(codeFolding(), foldGutter());
  }

  return extensions;
}

export interface EditorCommandHandle {
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  selectLine: () => void;
  duplicateLine: () => void;
  deleteLine: () => void;
  toggleComment: () => void;
  toggleBlockComment: () => void;
  foldAll: () => void;
  unfoldAll: () => void;
  goToLine: (lineNumber: number) => void;
  openSearch: () => void;
  runSearchQuery: (opts: {
    search: string;
    replace: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    regexp: boolean;
  }) => void;
  findNext: () => void;
  findPrevious: () => void;
  replaceNext: () => void;
  replaceAll: () => void;
  insertText: (text: string) => void;
  getSelectionText: () => string;
  replaceSelectionText: (text: string) => void;
  copySelection: () => Promise<void>;
  cutSelection: () => Promise<void>;
  pasteClipboard: () => Promise<void>;
}

export function createImperativeHandle(view: EditorView): EditorCommandHandle {
  return {
    undo: () => {
      undo(view);
      view.focus();
    },
    redo: () => {
      redo(view);
      view.focus();
    },
    selectAll: () => {
      selectAll(view);
      view.focus();
    },
    selectLine: () => {
      selectLine(view);
      view.focus();
    },
    duplicateLine: () => {
      copyLineDown(view);
      view.focus();
    },
    deleteLine: () => {
      deleteLine(view);
      view.focus();
    },
    toggleComment: () => {
      toggleComment(view);
      view.focus();
    },
    toggleBlockComment: () => {
      toggleBlockComment(view);
      view.focus();
    },
    foldAll: () => {
      foldAll(view);
    },
    unfoldAll: () => {
      unfoldAll(view);
    },
    goToLine: (lineNumber: number) => {
      const clamped = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
      const line = view.state.doc.line(clamped);
      view.dispatch({
        selection: EditorSelection.cursor(line.from),
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
      view.focus();
    },
    openSearch: () => {
      openSearchPanel(view);
    },
    runSearchQuery: (opts) => {
      const query = new SearchQuery({
        search: opts.search,
        replace: opts.replace,
        caseSensitive: opts.caseSensitive,
        wholeWord: opts.wholeWord,
        regexp: opts.regexp,
      });
      view.dispatch({ effects: setSearchQuery.of(query) });
    },
    findNext: () => {
      findNext(view);
    },
    findPrevious: () => {
      findPrevious(view);
    },
    replaceNext: () => {
      replaceNext(view);
    },
    replaceAll: () => {
      replaceAll(view);
    },
    insertText: (text: string) => {
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: text },
        selection: EditorSelection.cursor(sel.from + text.length),
      });
      view.focus();
    },
    getSelectionText: () => {
      const sel = view.state.selection.main;
      return view.state.sliceDoc(sel.from, sel.to);
    },
    replaceSelectionText: (text: string) => {
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: text },
        selection: EditorSelection.cursor(sel.from + text.length),
      });
      view.focus();
    },
    copySelection: async () => {
      const sel = view.state.selection.main;
      const text = view.state.sliceDoc(sel.from, sel.to);
      if (text && navigator.clipboard) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }
      view.focus();
    },
    cutSelection: async () => {
      const sel = view.state.selection.main;
      const text = view.state.sliceDoc(sel.from, sel.to);
      if (text) {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text).catch(() => {});
        }
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: '' },
          selection: EditorSelection.cursor(sel.from),
        });
      }
      view.focus();
    },
    pasteClipboard: async () => {
      if (!navigator.clipboard) return;
      try {
        const text = await navigator.clipboard.readText();
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: EditorSelection.cursor(sel.from + text.length),
        });
      } catch {
        // Clipboard permission denied
      }
      view.focus();
    },
  };
}
