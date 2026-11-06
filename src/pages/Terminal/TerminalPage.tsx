import React, { useState } from 'react';
import { Cpu, RefreshCw, TerminalSquare } from 'lucide-react';
import type { ToolchainInfo } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { TerminalWorkspace } from '../../components/Terminal/TerminalWorkspace';

export const TerminalPage: React.FC = () => {
  const theme = useIDETheme();
  const toolchains = useIDEStore((s) => s.toolchains);
  const loading = useIDEStore((s) => s.toolchainsLoading);
  const probeToolchains = useIDEStore((s) => s.probeToolchains);
  const updateToolchainConfig = useIDEStore((s) => s.updateToolchainConfig);

  const [showToolchainManager, setShowToolchainManager] = useState(false);
  const [configuringToolchain, setConfiguringToolchain] = useState<ToolchainInfo | null>(null);
  const [customPathInput, setCustomPathInput] = useState('');

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      {/* Sub-header toggling Shell vs Toolchain Manager */}
      <div
        className="px-4 py-2 border-b flex items-center justify-between gap-3 shrink-0 select-none"
        style={{
          backgroundColor: theme.ui.bgSecondary,
          borderColor: theme.ui.border,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <TerminalSquare className="w-4 h-4" style={{ color: theme.ui.accent }} />
          <span>Integrated Terminal &amp; Toolchain Manager</span>
        </div>

        <button
          type="button"
          onClick={() => setShowToolchainManager(!showToolchainManager)}
          className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
          style={{
            backgroundColor: showToolchainManager ? theme.ui.bgElevated : theme.ui.bgPrimary,
            borderColor: showToolchainManager ? theme.ui.accent : theme.ui.border,
            color: showToolchainManager ? theme.ui.accent : theme.ui.textPrimary,
          }}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>
            Toolchains ({toolchains.filter((t) => t.installed).length}/{toolchains.length})
          </span>
        </button>
      </div>

      {showToolchainManager ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Compilers &amp; Runtime Toolchains</h2>
                <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
                  Real binary detection on host runtime. On Android 9+ ARM64 devices, install compilers via Termux or custom ARM64 sysroot paths.
                </p>
              </div>
              <button
                type="button"
                onClick={() => probeToolchains()}
                className="h-9 px-3.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
                style={{ borderColor: theme.ui.border }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Scan Environment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {toolchains.map((tc) => (
                <div
                  key={tc.id}
                  className="p-4 rounded-xl border flex flex-col justify-between gap-3"
                  style={{
                    backgroundColor: theme.ui.bgSecondary,
                    borderColor: theme.ui.border,
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{tc.name}</span>
                      <span
                        className="text-[11px] font-mono-code font-medium"
                        style={{ color: tc.installed ? '#22C55E' : theme.ui.textSecondary }}
                      >
                        {tc.installed ? 'Ready' : 'Not Installed'}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: theme.ui.textSecondary }}>
                      {tc.installNotes}
                    </p>

                    <div className="text-[11px] font-mono-code pt-1 space-y-0.5" style={{ color: theme.ui.textSecondary }}>
                      <div>Arch: {tc.architecture}</div>
                      {tc.installed ? (
                        <>
                          <div className="truncate">Version: {tc.version}</div>
                          <div className="truncate">Path: {tc.customPath || tc.binaryPath}</div>
                        </>
                      ) : (
                        <div>Termux: {tc.termuxPackage}</div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setConfiguringToolchain(tc);
                      setCustomPathInput(tc.customPath || tc.binaryPath || '');
                    }}
                    className="h-8 px-3 rounded-lg border text-xs font-medium hover:bg-slate-500/10 text-center"
                    style={{ borderColor: theme.ui.border }}
                  >
                    Configure Path &amp; Env
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <TerminalWorkspace />
        </div>
      )}

      {configuringToolchain && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateToolchainConfig(configuringToolchain.id, customPathInput.trim(), {});
              setConfiguringToolchain(null);
            }}
            className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <div>
              <h3 className="text-sm font-semibold">Configure {configuringToolchain.name}</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
                Termux ARM64 command: <code className="font-mono-code">{configuringToolchain.termuxPackage}</code>
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Binary Executable Path</label>
              <input
                type="text"
                value={customPathInput}
                onChange={(e) => setCustomPathInput(e.target.value)}
                placeholder={`/data/data/com.termux/files/usr/bin/${configuringToolchain.binaryName}`}
                className="w-full h-10 px-3 rounded-lg border text-xs font-mono-code focus:outline-none"
                style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfiguringToolchain(null)}
                className="h-9 px-3.5 rounded-lg text-xs hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
