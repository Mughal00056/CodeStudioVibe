import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { PreviewService } from '../../services/PreviewService';

interface LivePreviewPanelProps {
  onCloseSplit?: () => void;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({ onCloseSplit }) => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const files = useIDEStore((s) => s.files);
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const previewSettings = useIDEStore((s) => s.settings.preview);
  const updateSettings = useIDEStore((s) => s.updateSettings);
  const previewConsole = useIDEStore((s) => s.previewConsole);
  const appendPreviewConsole = useIDEStore((s) => s.appendPreviewConsole);
  const clearPreviewConsole = useIDEStore((s) => s.clearPreviewConsole);
  const previewRefreshNonce = useIDEStore((s) => s.previewRefreshNonce);
  const triggerPreviewRefresh = useIDEStore((s) => s.triggerPreviewRefresh);

  const [selectedEntryPath, setSelectedEntryPath] = useState<string>('');
  const [viewportMode, setViewportMode] = useState<'responsive' | 'mobile' | 'desktop'>(
    previewSettings.defaultViewport === 'mobile'
      ? 'mobile'
      : previewSettings.defaultViewport === 'desktop'
        ? 'desktop'
        : 'responsive'
  );
  const [customWidth, setCustomWidth] = useState(previewSettings.customWidth || 390);
  const [customHeight, setCustomHeight] = useState(previewSettings.customHeight || 844);
  const [showConsole, setShowConsole] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Navigation history across previewed HTML entries
  const [historyStack, setHistoryStack] = useState<string[]>(['index.html']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Merge live unsaved editor tab contents into project files for instant CSS/JS/HTML live reload
  const liveProjectFiles = useMemo(() => {
    const projFiles = files.filter((f) => f.projectId === activeProjectId);
    const tabMap = new Map(
      openTabs
        .filter((t) => t.projectId === activeProjectId)
        .map((t) => [t.path, t.content])
    );

    return projFiles.map((f) =>
      tabMap.has(f.path) ? { ...f, content: tabMap.get(f.path)! } : f
    );
  }, [files, activeProjectId, openTabs]);

  const htmlEntries = useMemo(
    () =>
      liveProjectFiles
        .filter((f) => f.type === 'file' && /\.(html|htm)$/i.test(f.name))
        .map((f) => f.path),
    [liveProjectFiles]
  );

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const effectiveEntry =
    selectedEntryPath ||
    (activeTab?.path.endsWith('.html') ? activeTab.path : '') ||
    htmlEntries[0] ||
    '';

  const bundle = useMemo(
    () =>
      PreviewService.buildPreviewDocument(
        liveProjectFiles,
        effectiveEntry,
        previewSettings.javascriptEnabled
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveProjectFiles, effectiveEntry, previewSettings.javascriptEnabled, previewRefreshNonce]
  );

  // Listen to postMessage console & error logs from sandboxed iframe
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data && ev.data.source === 'codex-preview') {
        appendPreviewConsole({
          level: ev.data.level || 'log',
          message: String(ev.data.message || ''),
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [appendPreviewConsole]);

  const selectEntry = (path: string) => {
    setSelectedEntryPath(path);
    const nextStack = [...historyStack.slice(0, historyIndex + 1), path];
    setHistoryStack(nextStack);
    setHistoryIndex(nextStack.length - 1);
  };

  const goBack = () => {
    if (historyIndex <= 0) return;
    const nextIdx = historyIndex - 1;
    setHistoryIndex(nextIdx);
    setSelectedEntryPath(historyStack[nextIdx]);
  };

  const goForward = () => {
    if (historyIndex >= historyStack.length - 1) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    setSelectedEntryPath(historyStack[nextIdx]);
  };

  const errorCount = previewConsole.filter((c) => c.level === 'error').length;

  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col'
    : 'flex flex-col h-full w-full overflow-hidden';

  return (
    <div
      className={wrapperClass}
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      {/* Top Preview Control Bar */}
      <div
        className="px-2.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 select-none"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
        }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={goBack}
            title="Back"
            aria-label="Back"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 disabled:opacity-35"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={historyIndex >= historyStack.length - 1}
            onClick={goForward}
            title="Forward"
            aria-label="Forward"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10 disabled:opacity-35"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={triggerPreviewRefresh}
            title="Refresh Preview"
            aria-label="Refresh Preview"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {htmlEntries.length > 0 ? (
            <select
              aria-label="Preview Entry HTML"
              value={bundle.entryFile}
              onChange={(e) => selectEntry(e.target.value)}
              className="h-8 px-2.5 rounded-lg border text-xs font-mono-code max-w-[175px] truncate focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            >
              {htmlEntries.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-mono-code px-2 opacity-75 truncate">
              {bundle.entryFile}
            </span>
          )}
        </div>

        {/* Viewport & Console Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div
            className="flex items-center p-0.5 rounded-lg border text-xs"
            style={{
              backgroundColor: theme.ui.bgPrimary,
              borderColor: theme.ui.border,
            }}
          >
            <button
              type="button"
              onClick={() => setViewportMode('responsive')}
              className="px-2 py-1 rounded-md font-medium whitespace-nowrap"
              style={{
                backgroundColor:
                  viewportMode === 'responsive' ? theme.ui.bgElevated : 'transparent',
                color:
                  viewportMode === 'responsive' ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('mobile')}
              title="Mobile Viewport"
              className="px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap"
              style={{
                backgroundColor:
                  viewportMode === 'mobile' ? theme.ui.bgElevated : 'transparent',
                color:
                  viewportMode === 'mobile' ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('desktop')}
              title="Desktop Viewport"
              className="px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap"
              style={{
                backgroundColor:
                  viewportMode === 'desktop' ? theme.ui.bgElevated : 'transparent',
                color:
                  viewportMode === 'desktop' ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
          </div>

          {viewportMode === 'mobile' && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono-code">
              <input
                type="number"
                aria-label="Device Width"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(240, Number(e.target.value) || 390))}
                className="w-14 h-7 px-1.5 rounded border text-center tabular-nums"
                style={{
                  backgroundColor: theme.ui.bgPrimary,
                  borderColor: theme.ui.border,
                }}
              />
              <span>×</span>
              <input
                type="number"
                aria-label="Device Height"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(320, Number(e.target.value) || 844))}
                className="w-14 h-7 px-1.5 rounded border text-center tabular-nums"
                style={{
                  backgroundColor: theme.ui.bgPrimary,
                  borderColor: theme.ui.border,
                }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              updateSettings((s) => ({
                ...s,
                preview: {
                  ...s.preview,
                  javascriptEnabled: !s.preview.javascriptEnabled,
                },
              }))
            }
            className="h-8 px-2.5 rounded-lg border text-xs font-mono-code whitespace-nowrap"
            style={{
              backgroundColor: theme.ui.bgPrimary,
              borderColor: theme.ui.border,
              color: previewSettings.javascriptEnabled ? theme.ui.accent : theme.ui.textSecondary,
            }}
          >
            JS: {previewSettings.javascriptEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            className="h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
            style={{
              backgroundColor: showConsole ? theme.ui.bgElevated : theme.ui.bgPrimary,
              borderColor: errorCount > 0 ? '#EF4444' : theme.ui.border,
              color: errorCount > 0 ? '#F87171' : theme.ui.textPrimary,
            }}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console ({previewConsole.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
            aria-label="Toggle Fullscreen Preview"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onCloseSplit && !fullscreen && (
            <button
              type="button"
              onClick={onCloseSplit}
              title="Close Split Preview"
              aria-label="Close Split Preview"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sandboxed WebView / Iframe Viewport */}
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-2 sm:p-4 bg-slate-950/30">
        <div
          className="bg-white rounded-xl overflow-hidden border shadow-xl transition-all"
          style={{
            borderColor: theme.ui.border,
            width:
              viewportMode === 'mobile'
                ? `${customWidth}px`
                : viewportMode === 'desktop'
                  ? '1280px'
                  : '100%',
            height:
              viewportMode === 'mobile'
                ? `${customHeight}px`
                : viewportMode === 'desktop'
                  ? '800px'
                  : '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <iframe
            key={`${bundle.entryFile}_${previewRefreshNonce}_${previewSettings.javascriptEnabled}`}
            title="CodeX Live HTML Preview"
            sandbox={
              previewSettings.javascriptEnabled
                ? 'allow-scripts allow-forms allow-modals'
                : ''
            }
            srcDoc={bundle.html}
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>

      {/* Live Preview Console & Error Drawer */}
      {showConsole && (
        <div
          className="h-44 border-t flex flex-col shrink-0"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
          }}
        >
          <div
            className="px-3 py-1.5 border-b flex items-center justify-between text-xs"
            style={{ borderColor: theme.ui.border }}
          >
            <span className="font-semibold">Preview Console &amp; Errors</span>
            <button
              type="button"
              onClick={clearPreviewConsole}
              className="px-2 py-0.5 rounded hover:bg-slate-500/10 flex items-center gap-1 text-[11px]"
              style={{ color: theme.ui.textSecondary }}
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono-code text-xs">
            {previewConsole.length === 0 ? (
              <p className="p-2 text-center" style={{ color: theme.ui.textSecondary }}>
                No console output or runtime errors logged yet.
              </p>
            ) : (
              previewConsole.map((entry) => (
                <div
                  key={entry.id}
                  className="px-2.5 py-1 rounded border flex items-baseline justify-between gap-3"
                  style={{
                    backgroundColor:
                      entry.level === 'error'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : entry.level === 'warn'
                          ? 'rgba(245, 158, 11, 0.1)'
                          : theme.ui.bgPrimary,
                    borderColor:
                      entry.level === 'error'
                        ? 'rgba(239, 68, 68, 0.35)'
                        : theme.ui.border,
                    color:
                      entry.level === 'error'
                        ? '#F87171'
                        : entry.level === 'warn'
                          ? '#FBBF24'
                          : theme.ui.textPrimary,
                  }}
                >
                  <span className="break-all">{entry.message}</span>
                  <span className="text-[10px] opacity-60 shrink-0 tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
