import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';

export const ToolchainsSidebarPanel: React.FC = () => {
  const theme = useIDETheme();
  const toolchains = useIDEStore((s) => s.toolchains);
  const loading = useIDEStore((s) => s.toolchainsLoading);
  const probeToolchains = useIDEStore((s) => s.probeToolchains);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);

  return (
    <div className="flex flex-col h-full text-xs select-none overflow-hidden">
      <div
        className="px-3 py-2.5 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: theme.ui.border }}
      >
        <span className="font-semibold">Compilers &amp; Runtimes</span>
        <button
          type="button"
          onClick={() => probeToolchains()}
          title="Re-scan Installed Binaries"
          className="h-7 w-7 rounded flex items-center justify-center hover:bg-slate-500/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-[11px] leading-relaxed" style={{ color: theme.ui.textSecondary }}>
          Syntax highlighting works offline for all languages. Execution requires an installed ARM64 or host runtime binary.
        </p>

        {toolchains.map((tc) => (
          <div
            key={tc.id}
            className="p-2.5 rounded-xl border space-y-1"
            style={{
              backgroundColor: theme.ui.bgPrimary,
              borderColor: theme.ui.border,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{tc.name}</span>
              <span
                className="font-mono-code text-[11px]"
                style={{ color: tc.installed ? '#22C55E' : theme.ui.textSecondary }}
              >
                {tc.installed ? 'Installed' : 'Not Installed'}
              </span>
            </div>

            {tc.installed && tc.version ? (
              <div className="font-mono-code text-[11px] truncate" style={{ color: theme.ui.textSecondary }}>
                {tc.version} · {tc.binaryPath}
              </div>
            ) : (
              <div className="font-mono-code text-[11px]" style={{ color: theme.ui.textSecondary }}>
                Android Termux: {tc.termuxPackage}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t shrink-0" style={{ borderColor: theme.ui.border }}>
        <button
          type="button"
          onClick={() => setActiveRoute('terminal')}
          className="w-full h-9 rounded-lg font-semibold"
          style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
        >
          Open Terminal &amp; Toolchain Shell
        </button>
      </div>
    </div>
  );
};
