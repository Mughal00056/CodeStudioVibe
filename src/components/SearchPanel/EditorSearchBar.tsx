import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CaseSensitive,
  Regex,
  Replace,
  ReplaceAll,
  WholeWord,
  X,
} from 'lucide-react';
import type { EditorCommandHandle } from '../../editor/EditorExtensions';
import { useIDETheme } from '../../context/ThemeContext';

interface EditorSearchBarProps {
  editorRef: React.RefObject<EditorCommandHandle | null>;
  initialShowReplace: boolean;
  onClose: () => void;
}

export const EditorSearchBar: React.FC<EditorSearchBarProps> = ({
  editorRef,
  initialShowReplace,
  onClose,
}) => {
  const theme = useIDETheme();
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(initialShowReplace);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexp, setRegexp] = useState(false);

  useEffect(() => {
    setShowReplace(initialShowReplace);
  }, [initialShowReplace]);

  useEffect(() => {
    editorRef.current?.runSearchQuery({
      search: findText,
      replace: replaceText,
      caseSensitive,
      wholeWord,
      regexp,
    });
  }, [findText, replaceText, caseSensitive, wholeWord, regexp, editorRef]);

  return (
    <div
      className="px-3 py-2 border-b flex flex-col gap-2 text-xs select-none shrink-0"
      style={{
        backgroundColor: theme.ui.bgSecondary,
        borderColor: theme.ui.border,
        color: theme.ui.textPrimary,
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex-1 min-w-[160px]">
          <input
            type="text"
            autoFocus
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) editorRef.current?.findPrevious();
                else editorRef.current?.findNext();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Find in file..."
            className="w-full h-8 px-2.5 rounded-lg border text-xs font-mono-code focus:outline-none"
            style={{
              backgroundColor: theme.ui.bgPrimary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          />
        </div>

        <button
          type="button"
          title="Match Case"
          aria-pressed={caseSensitive}
          onClick={() => setCaseSensitive(!caseSensitive)}
          className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors"
          style={{
            backgroundColor: caseSensitive ? theme.ui.accent : theme.ui.bgPrimary,
            borderColor: caseSensitive ? theme.ui.accent : theme.ui.border,
            color: caseSensitive ? theme.ui.accentText : theme.ui.textSecondary,
          }}
        >
          <CaseSensitive className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Whole Word"
          aria-pressed={wholeWord}
          onClick={() => setWholeWord(!wholeWord)}
          className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors"
          style={{
            backgroundColor: wholeWord ? theme.ui.accent : theme.ui.bgPrimary,
            borderColor: wholeWord ? theme.ui.accent : theme.ui.border,
            color: wholeWord ? theme.ui.accentText : theme.ui.textSecondary,
          }}
        >
          <WholeWord className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Regular Expression"
          aria-pressed={regexp}
          onClick={() => setRegexp(!regexp)}
          className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors"
          style={{
            backgroundColor: regexp ? theme.ui.accent : theme.ui.bgPrimary,
            borderColor: regexp ? theme.ui.accent : theme.ui.border,
            color: regexp ? theme.ui.accentText : theme.ui.textSecondary,
          }}
        >
          <Regex className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Previous Match (Shift+Enter)"
          onClick={() => editorRef.current?.findPrevious()}
          className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-slate-500/10"
          style={{ borderColor: theme.ui.border }}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          title="Next Match (Enter)"
          onClick={() => editorRef.current?.findNext()}
          className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-slate-500/10"
          style={{ borderColor: theme.ui.border }}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowReplace(!showReplace)}
          className="h-8 px-2.5 rounded-lg border text-xs font-medium hover:bg-slate-500/10 whitespace-nowrap"
          style={{ borderColor: theme.ui.border }}
        >
          {showReplace ? 'Hide Replace' : 'Replace'}
        </button>

        <button
          type="button"
          aria-label="Close find bar"
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showReplace && (
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative flex-1 min-w-[160px]">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="w-full h-8 px-2.5 rounded-lg border text-xs font-mono-code focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => editorRef.current?.replaceNext()}
            className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10 whitespace-nowrap"
            style={{ borderColor: theme.ui.border }}
          >
            <Replace className="w-3.5 h-3.5" />
            <span>Replace</span>
          </button>

          <button
            type="button"
            onClick={() => editorRef.current?.replaceAll()}
            className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
          >
            <ReplaceAll className="w-3.5 h-3.5" />
            <span>Replace All</span>
          </button>
        </div>
      )}
    </div>
  );
};
