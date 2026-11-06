import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { EditorSettings, IDETheme } from '../types';
import { createSyntaxHighlightExtension } from './SyntaxHighlight';

export function createEditorThemeExtension(
  theme: IDETheme,
  settings: EditorSettings
): Extension {
  const e = theme.editor;
  const cursorRule: Record<string, string> =
    settings.cursorStyle === 'block'
      ? {
          borderLeft: 'none',
          backgroundColor: e.cursorColor,
          opacity: '0.7',
          width: '0.6em',
        }
      : settings.cursorStyle === 'underline'
        ? {
            borderLeft: 'none',
            borderBottom: `2px solid ${e.cursorColor}`,
            width: '0.6em',
          }
        : {
            borderLeftColor: e.cursorColor,
            borderLeftWidth: '2px',
          };

  const baseTheme = EditorView.theme(
    {
      '&': {
        backgroundColor: e.background,
        color: e.foreground,
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
        height: '100%',
      },
      '.cm-content': {
        caretColor: e.cursorColor,
        fontFamily: settings.fontFamily,
        lineHeight: String(settings.lineHeight),
        paddingTop: '10px',
        paddingBottom: '48px',
      },
      '.cm-cursor, .cm-dropCursor': cursorRule,
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: e.selectionBackground,
      },
      '.cm-activeLine': {
        backgroundColor: e.activeLineBackground,
      },
      '.cm-gutters': {
        backgroundColor: e.gutterBackground,
        color: e.gutterForeground,
        borderRight: `1px solid ${theme.ui.border}`,
        fontFamily: settings.fontFamily,
        fontVariantNumeric: 'tabular-nums',
      },
      '.cm-activeLineGutter': {
        backgroundColor: e.activeLineBackground,
        color: theme.ui.textPrimary,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: theme.ui.bgElevated,
        border: `1px solid ${theme.ui.border}`,
        color: theme.ui.textSecondary,
        borderRadius: '4px',
        padding: '0 6px',
      },
      '.cm-tooltip': {
        backgroundColor: theme.ui.bgSecondary,
        border: `1px solid ${theme.ui.border}`,
        color: theme.ui.textPrimary,
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
      },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: theme.ui.accent,
        color: theme.ui.accentText,
      },
      '.cm-panels': {
        backgroundColor: theme.ui.bgSecondary,
        color: theme.ui.textPrimary,
        borderBottom: `1px solid ${theme.ui.border}`,
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(250, 204, 21, 0.25)',
        outline: '1px solid rgba(250, 204, 21, 0.55)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(59, 130, 246, 0.35)',
      },
    },
    { dark: theme.isDark }
  );

  return [baseTheme, createSyntaxHighlightExtension(theme)];
}
