import React, { useMemo } from 'react';
import { Code2 } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';

interface OutlineSidebarPanelProps {
  onJumpToLine?: (line: number) => void;
}

export const OutlineSidebarPanel: React.FC<OutlineSidebarPanelProps> = ({ onJumpToLine }) => {
  const theme = useIDETheme();
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;

  const symbols = useMemo(() => {
    if (!activeTab) return [];
    const lines = activeTab.content.split('\n');
    const found: Array<{ line: number; kind: string; name: string }> = [];

    lines.forEach((raw, idx) => {
      const lineNum = idx + 1;
      const trimmed = raw.trim();

      const fnMatch = trimmed.match(
        /^(?:export\s+)?(?:async\s+)?(?:function|fun|def|fn|func)\s+([a-zA-Z0-9_$]+)/
      );
      if (fnMatch) {
        found.push({ line: lineNum, kind: 'fn', name: fnMatch[1] });
        return;
      }

      const clsMatch = trimmed.match(
        /^(?:export\s+)?(?:abstract\s+)?(?:class|interface|struct|enum|data class|object)\s+([a-zA-Z0-9_$]+)/
      );
      if (clsMatch) {
        found.push({ line: lineNum, kind: 'type', name: clsMatch[1] });
        return;
      }

      const constFnMatch = trimmed.match(
        /^(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/
      );
      if (constFnMatch) {
        found.push({ line: lineNum, kind: 'fn', name: constFnMatch[1] });
        return;
      }

      if (activeTab.language === 'markdown') {
        const mdMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (mdMatch) {
          found.push({ line: lineNum, kind: `H${mdMatch[1].length}`, name: mdMatch[2] });
        }
      }
    });

    return found;
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full text-xs select-none">
      <div className="px-3 py-2.5 border-b font-semibold shrink-0" style={{ borderColor: theme.ui.border }}>
        Document Outline
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!activeTab ? (
          <p className="p-3 text-center" style={{ color: theme.ui.textSecondary }}>
            Open a source file to view its symbol outline.
          </p>
        ) : symbols.length === 0 ? (
          <p className="p-3 text-center" style={{ color: theme.ui.textSecondary }}>
            No functions, classes, or headings detected in {activeTab.name}.
          </p>
        ) : (
          symbols.map((sym, i) => (
            <button
              key={`${sym.line}_${i}`}
              type="button"
              onClick={() => onJumpToLine?.(sym.line)}
              className="w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 text-left hover:bg-slate-500/10"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
                <span className="truncate font-medium">{sym.name}</span>
              </div>
              <span className="font-mono-code text-[11px] opacity-65 tabular-nums shrink-0">
                {sym.kind} · L{sym.line}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
