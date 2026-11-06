import React, { useMemo, useState } from 'react';
import { CaseSensitive, FileCode2, Folder, Regex, Search } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';

interface GlobalSearchPanelProps {
  onJumpToLine?: (line: number) => void;
}

export const GlobalSearchPanel: React.FC<GlobalSearchPanelProps> = ({ onJumpToLine }) => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const files = useIDEStore((s) => s.files);
  const openFileInTab = useIDEStore((s) => s.openFileInTab);
  const setSidebarOpen = useIDEStore((s) => s.setSidebarOpen);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'project' | 'all'>('project');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const candidateFiles = files.filter((f) =>
      scope === 'project' ? f.projectId === activeProjectId : true
    );

    let matcher: RegExp | null = null;
    if (useRegex) {
      try {
        matcher = new RegExp(q, caseSensitive ? 'g' : 'gi');
      } catch {
        return [];
      }
    }

    const matches: Array<{
      projectId: string;
      path: string;
      name: string;
      type: 'file' | 'folder';
      lineMatches: Array<{ line: number; preview: string }>;
    }> = [];

    for (const item of candidateFiles) {
      const nameMatch = matcher
        ? matcher.test(item.path)
        : caseSensitive
          ? item.path.includes(q)
          : item.path.toLowerCase().includes(q.toLowerCase());

      if (matcher) matcher.lastIndex = 0;

      const lineMatches: Array<{ line: number; preview: string }> = [];
      if (item.type === 'file') {
        const lines = item.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          const hit = matcher
            ? matcher.test(lineText)
            : caseSensitive
              ? lineText.includes(q)
              : lineText.toLowerCase().includes(q.toLowerCase());
          if (matcher) matcher.lastIndex = 0;
          if (hit) {
            lineMatches.push({
              line: i + 1,
              preview: lineText.trim().slice(0, 90),
            });
            if (lineMatches.length >= 15) break;
          }
        }
      }

      if (nameMatch || lineMatches.length > 0) {
        matches.push({
          projectId: item.projectId,
          path: item.path,
          name: item.name,
          type: item.type,
          lineMatches,
        });
      }

      if (matches.length >= 50) break;
    }

    return matches;
  }, [query, scope, caseSensitive, useRegex, files, activeProjectId]);

  return (
    <div className="flex flex-col h-full select-none">
      <div className="p-3 border-b space-y-2 shrink-0" style={{ borderColor: theme.ui.border }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Global Search</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScope('project')}
              className="px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                backgroundColor: scope === 'project' ? theme.ui.bgElevated : 'transparent',
                color: scope === 'project' ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              Project
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className="px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                backgroundColor: scope === 'all' ? theme.ui.bgElevated : 'transparent',
                color: scope === 'all' ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: theme.ui.textSecondary }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files, folders, or code..."
              className="w-full h-8 pl-8 pr-2 rounded-lg border text-xs focus:outline-none"
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
            onClick={() => setCaseSensitive(!caseSensitive)}
            className="h-8 w-8 rounded-lg border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: caseSensitive ? theme.ui.accent : theme.ui.bgPrimary,
              borderColor: caseSensitive ? theme.ui.accent : theme.ui.border,
              color: caseSensitive ? theme.ui.accentText : theme.ui.textSecondary,
            }}
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Regex"
            onClick={() => setUseRegex(!useRegex)}
            className="h-8 w-8 rounded-lg border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: useRegex ? theme.ui.accent : theme.ui.bgPrimary,
              borderColor: useRegex ? theme.ui.accent : theme.ui.border,
              color: useRegex ? theme.ui.accentText : theme.ui.textSecondary,
            }}
          >
            <Regex className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {!query.trim() ? (
          <p className="px-2 py-4 text-center" style={{ color: theme.ui.textSecondary }}>
            Enter a filename, folder path, or code symbol to search across your workspace.
          </p>
        ) : results.length === 0 ? (
          <p className="px-2 py-4 text-center" style={{ color: theme.ui.textSecondary }}>
            No matching files or lines found.
          </p>
        ) : (
          results.map((item) => (
            <div
              key={`${item.projectId}_${item.path}`}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: theme.ui.border, backgroundColor: theme.ui.bgPrimary }}
            >
              <button
                type="button"
                onClick={() => {
                  if (item.type === 'file') {
                    openFileInTab(item.projectId, item.path, true);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }
                }}
                className="w-full px-2.5 py-2 flex items-center gap-2 text-left hover:bg-slate-500/10 font-medium"
              >
                {item.type === 'folder' ? (
                  <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
                ) : (
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
                )}
                <span className="truncate">{item.path}</span>
              </button>

              {item.lineMatches.length > 0 && (
                <div className="border-t divide-y" style={{ borderColor: theme.ui.border }}>
                  {item.lineMatches.map((m) => (
                    <button
                      key={m.line}
                      type="button"
                      onClick={() => {
                        openFileInTab(item.projectId, item.path, true);
                        setTimeout(() => onJumpToLine?.(m.line), 60);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 flex items-baseline gap-2 text-left hover:bg-slate-500/10 font-mono-code text-[11px]"
                      style={{ borderColor: theme.ui.border }}
                    >
                      <span className="shrink-0 opacity-60 tabular-nums">{m.line}:</span>
                      <span className="truncate" style={{ color: theme.ui.textSecondary }}>
                        {m.preview}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
