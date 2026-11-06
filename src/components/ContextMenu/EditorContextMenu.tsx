import React, { useEffect } from 'react';
import type { EditorCommandHandle } from '../../editor/EditorExtensions';
import { useIDETheme } from '../../context/ThemeContext';

interface EditorContextMenuProps {
  position: { x: number; y: number } | null;
  editorRef: React.RefObject<EditorCommandHandle | null>;
  onFormat: () => void;
  onGoToLine: () => void;
  onClose: () => void;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  position,
  editorRef,
  onFormat,
  onGoToLine,
  onClose,
}) => {
  const theme = useIDETheme();

  useEffect(() => {
    if (!position) return;
    const close = () => onClose();
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [position, onClose]);

  if (!position) return null;

  const left = Math.min(position.x, window.innerWidth - 210);
  const top = Math.min(position.y, window.innerHeight - 310);

  return (
    <div
      className="fixed z-50 w-48 rounded-xl border shadow-2xl py-1.5 text-xs select-none"
      style={{
        left: `${Math.max(8, left)}px`,
        top: `${Math.max(8, top)}px`,
        backgroundColor: theme.ui.bgSecondary,
        borderColor: theme.ui.border,
        color: theme.ui.textPrimary,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          editorRef.current?.cutSelection();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Cut
      </button>
      <button
        type="button"
        onClick={() => {
          editorRef.current?.copySelection();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Copy
      </button>
      <button
        type="button"
        onClick={() => {
          editorRef.current?.pasteClipboard();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Paste
      </button>
      <button
        type="button"
        onClick={() => {
          editorRef.current?.selectAll();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Select All
      </button>

      <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

      <button
        type="button"
        onClick={() => {
          editorRef.current?.duplicateLine();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Duplicate Line
      </button>
      <button
        type="button"
        onClick={() => {
          editorRef.current?.deleteLine();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Delete Line
      </button>
      <button
        type="button"
        onClick={() => {
          editorRef.current?.toggleComment();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Toggle Comment
      </button>

      <div className="my-1 border-t" style={{ borderColor: theme.ui.border }} />

      <button
        type="button"
        onClick={() => {
          onFormat();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Format Document
      </button>
      <button
        type="button"
        onClick={() => {
          onGoToLine();
          onClose();
        }}
        className="w-full px-3.5 py-2 text-left hover:bg-slate-500/10"
      >
        Go To Line...
      </button>
    </div>
  );
};
