import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { EditorSettings, IDETheme, SupportedLanguageId } from '../types';
import { getLanguageExtension } from './LanguageSupport';
import { createEditorThemeExtension } from './EditorThemes';
import { createAutocompleteExtension } from './Autocomplete';
import {
  buildCoreEditorExtensions,
  createImperativeHandle,
  type EditorCommandHandle,
} from './EditorExtensions';

interface CodeEditorProps {
  tabId: string;
  value: string;
  language: SupportedLanguageId;
  theme: IDETheme;
  settings: EditorSettings;
  onChange: (nextValue: string) => void;
  onCursorChange: (line: number, col: number, selectionLength: number) => void;
  onSaveShortcut: () => void;
  onFormatShortcut: () => void;
  onContextMenuRequest?: (coords: { x: number; y: number }) => void;
}

export const CodeEditor = React.forwardRef<EditorCommandHandle, CodeEditorProps>(
  function CodeEditor(
    {
      tabId,
      value,
      language,
      theme,
      settings,
      onChange,
      onCursorChange,
      onSaveShortcut,
      onFormatShortcut,
      onContextMenuRequest,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const handleRef = useRef<EditorCommandHandle | null>(null);

    const languageCompartment = useMemo(() => new Compartment(), []);
    const themeCompartment = useMemo(() => new Compartment(), []);
    const autocompleteCompartment = useMemo(() => new Compartment(), []);
    const coreCompartment = useMemo(() => new Compartment(), []);

    const callbacksRef = useRef({
      onChange,
      onCursorChange,
      onSaveShortcut,
      onFormatShortcut,
      onContextMenuRequest,
    });
    callbacksRef.current = {
      onChange,
      onCursorChange,
      onSaveShortcut,
      onFormatShortcut,
      onContextMenuRequest,
    };

    useImperativeHandle(
      ref,
      () => ({
        undo: () => handleRef.current?.undo(),
        redo: () => handleRef.current?.redo(),
        selectAll: () => handleRef.current?.selectAll(),
        selectLine: () => handleRef.current?.selectLine(),
        duplicateLine: () => handleRef.current?.duplicateLine(),
        deleteLine: () => handleRef.current?.deleteLine(),
        toggleComment: () => handleRef.current?.toggleComment(),
        toggleBlockComment: () => handleRef.current?.toggleBlockComment(),
        foldAll: () => handleRef.current?.foldAll(),
        unfoldAll: () => handleRef.current?.unfoldAll(),
        goToLine: (line) => handleRef.current?.goToLine(line),
        openSearch: () => handleRef.current?.openSearch(),
        runSearchQuery: (opts) => handleRef.current?.runSearchQuery(opts),
        findNext: () => handleRef.current?.findNext(),
        findPrevious: () => handleRef.current?.findPrevious(),
        replaceNext: () => handleRef.current?.replaceNext(),
        replaceAll: () => handleRef.current?.replaceAll(),
        insertText: (txt) => handleRef.current?.insertText(txt),
        getSelectionText: () => handleRef.current?.getSelectionText() || '',
        replaceSelectionText: (txt) => handleRef.current?.replaceSelectionText(txt),
        copySelection: async () => handleRef.current?.copySelection(),
        cutSelection: async () => handleRef.current?.cutSelection(),
        pasteClipboard: async () => handleRef.current?.pasteClipboard(),
      }),
      []
    );

    // Mount CodeMirror 6 instance once and clean up strictly on unmount for 2 GB RAM efficiency
    useEffect(() => {
      if (!containerRef.current) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          callbacksRef.current.onChange(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          const selLen = Math.abs(
            update.state.selection.main.to - update.state.selection.main.from
          );
          callbacksRef.current.onCursorChange(
            line.number,
            head - line.from + 1,
            selLen
          );
        }
      });

      const domHandlers = EditorView.domEventHandlers({
        contextmenu: (event) => {
          if (callbacksRef.current.onContextMenuRequest) {
            event.preventDefault();
            callbacksRef.current.onContextMenuRequest({
              x: event.clientX,
              y: event.clientY,
            });
            return true;
          }
          return false;
        },
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
          coreCompartment.of(
            buildCoreEditorExtensions(
              settings,
              () => callbacksRef.current.onSaveShortcut(),
              () => callbacksRef.current.onFormatShortcut()
            )
          ),
          languageCompartment.of(
            getLanguageExtension(language, settings.tagClosing)
          ),
          themeCompartment.of(createEditorThemeExtension(theme, settings)),
          autocompleteCompartment.of(createAutocompleteExtension(language)),
          updateListener,
          domHandlers,
        ],
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      viewRef.current = view;
      handleRef.current = createImperativeHandle(view);

      return () => {
        view.destroy();
        viewRef.current = null;
        handleRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Synchronize document content when switching tabs or formatting externally
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }, [tabId, value]);

    // Reconfigure language & autocomplete dynamically
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: [
          languageCompartment.reconfigure(
            getLanguageExtension(language, settings.tagClosing)
          ),
          autocompleteCompartment.reconfigure(createAutocompleteExtension(language)),
        ],
      });
    }, [language, settings.tagClosing, languageCompartment, autocompleteCompartment]);

    // Reconfigure theme & editor preferences dynamically
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: [
          themeCompartment.reconfigure(createEditorThemeExtension(theme, settings)),
          coreCompartment.reconfigure(
            buildCoreEditorExtensions(
              settings,
              () => callbacksRef.current.onSaveShortcut(),
              () => callbacksRef.current.onFormatShortcut()
            )
          ),
        ],
      });
    }, [theme, settings, themeCompartment, coreCompartment]);

    const minimapLines = useMemo(() => {
      if (!settings.minimap) return [];
      return value.split('\n').slice(0, 140);
    }, [settings.minimap, value]);

    return (
      <div className="relative flex h-full w-full overflow-hidden">
        <div
          ref={containerRef}
          className="h-full flex-1 overflow-hidden"
          data-testid="codemirror-container"
        />
        {settings.minimap && (
          <aside
            aria-label="Code Minimap"
            className="hidden md:block w-20 shrink-0 border-l border-slate-200 dark:border-slate-800/80 select-none overflow-hidden px-1.5 py-2 opacity-75"
            style={{ backgroundColor: theme.editor.gutterBackground }}
          >
            <div className="space-y-0.5">
              {minimapLines.map((line, idx) => {
                const widthPct = Math.min(100, Math.max(8, Math.round((line.trim().length / 64) * 100)));
                return (
                  <div
                    key={idx}
                    className="h-[2px] rounded-xs"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: line.trim().startsWith('//') || line.trim().startsWith('#')
                        ? theme.editor.comment
                        : theme.editor.foreground,
                      opacity: 0.35,
                    }}
                  />
                );
              })}
            </div>
          </aside>
        )}
      </div>
    );
  }
);
