import React, { useEffect, useState } from 'react';
import {
  Archive,
  Download,
  Palette,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { BackupSnapshot, IDETheme } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { BUILT_IN_THEMES } from '../../themes/themes';
import { EDITOR_FONT_FAMILIES } from '../../editor/EditorConfig';
import { BackupService, type WorkspaceBackupPayload } from '../../services/BackupService';
import { FileSystemService } from '../../services/FileSystem';
import { StorageService } from '../../services/StorageService';
import { formatBytes, formatRelativeTime } from '../../utils/languageUtils';

export const SettingsPage: React.FC = () => {
  const theme = useIDETheme();
  const settings = useIDEStore((s) => s.settings);
  const customThemes = useIDEStore((s) => s.customThemes);
  const projects = useIDEStore((s) => s.projects);
  const files = useIDEStore((s) => s.files);
  const pluginStates = useIDEStore((s) => s.pluginStates);
  const backups = useIDEStore((s) => s.backups);

  const setTheme = useIDEStore((s) => s.setTheme);
  const saveCustomTheme = useIDEStore((s) => s.saveCustomTheme);
  const deleteCustomTheme = useIDEStore((s) => s.deleteCustomTheme);
  const updateSettings = useIDEStore((s) => s.updateSettings);
  const resetSettings = useIDEStore((s) => s.resetSettings);
  const createBackup = useIDEStore((s) => s.createBackup);
  const restoreBackup = useIDEStore((s) => s.restoreBackup);
  const restoreFromPayload = useIDEStore((s) => s.restoreFromPayload);
  const deleteBackup = useIDEStore((s) => s.deleteBackup);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [activeTab, setActiveTab] = useState<
    'general' | 'editor' | 'themes' | 'terminal' | 'files' | 'preview' | 'backup'
  >('themes');

  // Custom theme builder state
  const [customName, setCustomName] = useState('Midnight Cobalt');
  const [customIsDark, setCustomIsDark] = useState(true);
  const [customBg, setCustomBg] = useState('#0D1117');
  const [customSurface, setCustomSurface] = useState('#161B22');
  const [customText, setCustomText] = useState('#E6EDF3');
  const [customAccent, setCustomAccent] = useState('#3B82F6');
  const [customKeyword, setCustomKeyword] = useState('#C084FC');
  const [customString, setCustomString] = useState('#86EFAC');

  const [storageEstimate, setStorageEstimate] = useState<{ usedBytes: number; quotaBytes: number }>({
    usedBytes: 0,
    quotaBytes: 50_000_000,
  });
  const [pendingRestorePayload, setPendingRestorePayload] = useState<WorkspaceBackupPayload | null>(null);
  const [pendingRestoreSnap, setPendingRestoreSnap] = useState<BackupSnapshot | null>(null);

  useEffect(() => {
    StorageService.estimateStorageUsage().then(setStorageEstimate);
  }, [projects, files, backups]);

  const allThemes: IDETheme[] = [...Object.values(BUILT_IN_THEMES), ...customThemes];

  const handleSaveCustomTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom_${Date.now()}`;
    const newTheme: IDETheme = {
      id,
      name: customName.trim() || 'Custom Theme',
      isDark: customIsDark,
      isCustom: true,
      ui: {
        bgPrimary: customBg,
        bgSecondary: customSurface,
        bgElevated: customIsDark ? '#1E2636' : '#E2E8F0',
        border: customIsDark ? '#2A3447' : '#CBD5E1',
        textPrimary: customText,
        textSecondary: customIsDark ? '#94A3B8' : '#475569',
        accent: customAccent,
        accentText: '#FFFFFF',
      },
      editor: {
        ...BUILT_IN_THEMES[customIsDark ? 'dark' : 'light'].editor,
        background: customBg,
        foreground: customText,
        gutterBackground: customBg,
        cursorColor: customAccent,
        keyword: customKeyword,
        string: customString,
      },
      terminal: {
        ...BUILT_IN_THEMES[customIsDark ? 'dark' : 'light'].terminal,
        background: customBg,
        foreground: customText,
        cursor: customAccent,
      },
    };
    await saveCustomTheme(newTheme);
  };

  const handleExportFullZipBackup = async () => {
    const payload = BackupService.createBackupPayload({
      projects,
      files,
      settings,
      customThemes,
      pluginStates,
    });
    const blob = await BackupService.createZipBackupBlob(payload);
    FileSystemService.downloadBlob(blob, `CodeX-Studio-Backup-${new Date().toISOString().slice(0, 10)}.zip`);
    pushToast('success', 'Exported full workspace ZIP backup');
  };

  const handleExportSettingsJson = () => {
    const blob = new Blob([JSON.stringify({ settings, customThemes }, null, 2)], {
      type: 'application/json',
    });
    FileSystemService.downloadBlob(blob, 'codex-studio-settings.json');
    pushToast('success', 'Exported settings JSON');
  };

  return (
    <div
      className="h-full w-full overflow-y-auto px-4 sm:px-6 lg:px-10 py-6"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Settings &amp; Customization</h1>
            <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
              All preferences, custom themes, and backups persist locally in IndexedDB.
            </p>
          </div>

          <button
            type="button"
            onClick={resetSettings}
            className="h-9 px-3.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
            style={{ borderColor: theme.ui.border }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto"
          style={{
            backgroundColor: theme.ui.bgSecondary,
            borderColor: theme.ui.border,
          }}
        >
          {(
            [
              { id: 'themes', label: 'Themes' },
              { id: 'editor', label: 'Editor & Prettier' },
              { id: 'general', label: 'General' },
              { id: 'terminal', label: 'Terminal' },
              { id: 'files', label: 'File Manager' },
              { id: 'preview', label: 'Live Preview' },
              { id: 'backup', label: 'Backup & Storage' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
              style={{
                backgroundColor: activeTab === t.id ? theme.ui.bgElevated : 'transparent',
                color: activeTab === t.id ? theme.ui.accent : theme.ui.textSecondary,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* THEMES & CUSTOM THEME CREATOR */}
        {activeTab === 'themes' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Built-In &amp; Custom Themes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {allThemes.map((t) => {
                  const selected = t.id === settings.themeId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className="p-3.5 rounded-xl border cursor-pointer space-y-3 transition-colors"
                      style={{
                        backgroundColor: t.ui.bgSecondary,
                        borderColor: selected ? t.ui.accent : t.ui.border,
                        color: t.ui.textPrimary,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{t.name}</span>
                        <span className="text-[11px] font-mono-code" style={{ color: t.ui.accent }}>
                          {selected ? 'Active' : t.isDark ? 'Dark' : 'Light'}
                        </span>
                      </div>

                      <div
                        className="p-2.5 rounded-lg font-mono-code text-[11px] space-y-1 border"
                        style={{
                          backgroundColor: t.editor.background,
                          borderColor: t.ui.border,
                          color: t.editor.foreground,
                        }}
                      >
                        <div>
                          <span style={{ color: t.editor.keyword }}>const</span>{' '}
                          <span style={{ color: t.editor.function }}>init</span> = () =&gt;{' '}
                          <span style={{ color: t.editor.string }}>"ready"</span>;
                        </div>
                      </div>

                      {t.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomTheme(t.id);
                          }}
                          className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Custom Theme</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Custom Theme Builder */}
            <form
              onSubmit={handleSaveCustomTheme}
              className="rounded-2xl border p-5 space-y-4"
              style={{
                backgroundColor: theme.ui.bgSecondary,
                borderColor: theme.ui.border,
              }}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: theme.ui.accent }} />
                <h3 className="text-sm font-semibold">Create Custom Theme</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-medium mb-1">Theme Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border focus:outline-none"
                    style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Base Mode</label>
                  <select
                    value={customIsDark ? 'dark' : 'light'}
                    onChange={(e) => setCustomIsDark(e.target.value === 'dark')}
                    className="w-full h-9 px-3 rounded-lg border focus:outline-none"
                    style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                  >
                    <option value="dark">Dark Surface</option>
                    <option value="light">Light Surface</option>
                  </select>
                </div>

                {[
                  { label: 'Editor Background', val: customBg, set: setCustomBg },
                  { label: 'Panel Surface', val: customSurface, set: setCustomSurface },
                  { label: 'Text Foreground', val: customText, set: setCustomText },
                  { label: 'Primary Accent', val: customAccent, set: setCustomAccent },
                  { label: 'Syntax Keyword', val: customKeyword, set: setCustomKeyword },
                  { label: 'Syntax String', val: customString, set: setCustomString },
                ].map((c) => (
                  <div key={c.label}>
                    <label className="block font-medium mb-1">{c.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={c.val}
                        onChange={(e) => c.set(e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={c.val}
                        onChange={(e) => c.set(e.target.value)}
                        className="flex-1 h-9 px-2.5 rounded-lg border font-mono-code"
                        style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Apply Theme</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDITOR & PRETTIER */}
        {activeTab === 'editor' && (
          <div
            className="rounded-2xl border p-5 space-y-5 text-xs"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h2 className="text-sm font-semibold">CodeMirror 6 &amp; Prettier Preferences</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium mb-1">Font Size (px)</label>
                <input
                  type="number"
                  min={10}
                  max={26}
                  value={settings.editor.fontSize}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      editor: { ...s.editor, fontSize: Number(e.target.value) || 14 },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border font-mono-code tabular-nums"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Font Family</label>
                <select
                  value={settings.editor.fontFamily}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      editor: { ...s.editor, fontFamily: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                >
                  {EDITOR_FONT_FAMILIES.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Tab Size</label>
                <select
                  value={settings.editor.tabSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    updateSettings((s) => ({
                      ...s,
                      editor: {
                        ...s.editor,
                        tabSize: size,
                        formatting: { ...s.editor.formatting, tabWidth: size },
                      },
                    }));
                  }}
                  className="w-full h-9 px-3 rounded-lg border"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                >
                  <option value={2}>2 Spaces</option>
                  <option value={4}>4 Spaces</option>
                  <option value={8}>8 Spaces</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Cursor Style</label>
                <select
                  value={settings.editor.cursorStyle}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      editor: {
                        ...s.editor,
                        cursorStyle: e.target.value as 'line' | 'block' | 'underline',
                      },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                >
                  <option value="line">Line</option>
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Prettier Trailing Commas</label>
                <select
                  value={settings.editor.formatting.trailingComma}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      editor: {
                        ...s.editor,
                        formatting: {
                          ...s.editor.formatting,
                          trailingComma: e.target.value as 'none' | 'es5' | 'all',
                        },
                      },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                >
                  <option value="es5">ES5</option>
                  <option value="all">All</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {(
                [
                  {
                    key: 'wordWrap',
                    label: 'Word Wrap',
                    val: settings.editor.wordWrap,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, wordWrap: !s.editor.wordWrap },
                      })),
                  },
                  {
                    key: 'autoSave',
                    label: 'Auto Save Modified Files',
                    val: settings.editor.autoSave,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, autoSave: !s.editor.autoSave },
                      })),
                  },
                  {
                    key: 'lineNumbers',
                    label: 'Line Numbers',
                    val: settings.editor.lineNumbers,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, lineNumbers: !s.editor.lineNumbers },
                      })),
                  },
                  {
                    key: 'minimap',
                    label: 'Code Minimap Rail',
                    val: settings.editor.minimap,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, minimap: !s.editor.minimap },
                      })),
                  },
                  {
                    key: 'bracketClosing',
                    label: 'Auto Closing Brackets',
                    val: settings.editor.bracketClosing,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, bracketClosing: !s.editor.bracketClosing },
                      })),
                  },
                  {
                    key: 'tagClosing',
                    label: 'Auto Closing HTML Tags',
                    val: settings.editor.tagClosing,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, tagClosing: !s.editor.tagClosing },
                      })),
                  },
                  {
                    key: 'codeFolding',
                    label: 'Code Folding Gutters',
                    val: settings.editor.codeFolding,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: { ...s.editor, codeFolding: !s.editor.codeFolding },
                      })),
                  },
                  {
                    key: 'semi',
                    label: 'Prettier Semicolons',
                    val: settings.editor.formatting.semi,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: {
                          ...s.editor,
                          formatting: {
                            ...s.editor.formatting,
                            semi: !s.editor.formatting.semi,
                          },
                        },
                      })),
                  },
                  {
                    key: 'singleQuote',
                    label: 'Prettier Single Quotes',
                    val: settings.editor.formatting.singleQuote,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: {
                          ...s.editor,
                          formatting: {
                            ...s.editor.formatting,
                            singleQuote: !s.editor.formatting.singleQuote,
                          },
                        },
                      })),
                  },
                  {
                    key: 'formatOnSave',
                    label: 'Format On Save',
                    val: settings.editor.formatting.formatOnSave,
                    toggle: () =>
                      updateSettings((s) => ({
                        ...s,
                        editor: {
                          ...s.editor,
                          formatting: {
                            ...s.editor.formatting,
                            formatOnSave: !s.editor.formatting.formatOnSave,
                          },
                        },
                      })),
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.toggle}
                  className="p-3 rounded-xl border flex items-center justify-between text-left"
                  style={{
                    backgroundColor: theme.ui.bgPrimary,
                    borderColor: item.val ? theme.ui.accent : theme.ui.border,
                  }}
                >
                  <span className="font-medium">{item.label}</span>
                  <span
                    className="font-mono-code text-[11px]"
                    style={{ color: item.val ? theme.ui.accent : theme.ui.textSecondary }}
                  >
                    {item.val ? 'ON' : 'OFF'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div
            className="rounded-2xl border p-5 space-y-4 text-xs"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h2 className="text-sm font-semibold">General Application Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Startup Screen</label>
                <select
                  value={settings.general.startupScreen}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      general: {
                        ...s.general,
                        startupScreen: e.target.value as 'home' | 'editor' | 'projects',
                      },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                >
                  <option value="home">Home Dashboard</option>
                  <option value="editor">Code Editor</option>
                  <option value="projects">Projects List</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Default Android Project Directory</label>
                <input
                  type="text"
                  value={settings.general.defaultProjectFolder}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      general: { ...s.general, defaultProjectFolder: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border font-mono-code"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Desktop Sidebar Width (px)</label>
                <input
                  type="number"
                  min={210}
                  max={420}
                  value={settings.general.sidebarWidth}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      general: { ...s.general, sidebarWidth: Number(e.target.value) || 264 },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border font-mono-code tabular-nums"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TERMINAL SETTINGS */}
        {activeTab === 'terminal' && (
          <div
            className="rounded-2xl border p-5 space-y-4 text-xs"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h2 className="text-sm font-semibold">Integrated Terminal Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Default Shell Executable</label>
                <select
                  value={settings.terminal.defaultShell}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      terminal: {
                        ...s.terminal,
                        defaultShell: e.target.value as '/bin/bash' | '/bin/sh' | '/system/bin/sh',
                      },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border font-mono-code"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                >
                  <option value="/bin/bash">/bin/bash</option>
                  <option value="/bin/sh">/bin/sh</option>
                  <option value="/system/bin/sh">/system/bin/sh (Android)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Terminal Font Size (px)</label>
                <input
                  type="number"
                  min={10}
                  max={22}
                  value={settings.terminal.fontSize}
                  onChange={(e) =>
                    updateSettings((s) => ({
                      ...s,
                      terminal: { ...s.terminal, fontSize: Number(e.target.value) || 13 },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg border font-mono-code tabular-nums"
                  style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                />
              </div>
            </div>
          </div>
        )}

        {/* FILE MANAGER SETTINGS */}
        {activeTab === 'files' && (
          <div
            className="rounded-2xl border p-5 space-y-4 text-xs"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h2 className="text-sm font-semibold">File Explorer Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  updateSettings((s) => ({
                    ...s,
                    fileManager: {
                      ...s.fileManager,
                      showHiddenFiles: !s.fileManager.showHiddenFiles,
                    },
                  }))
                }
                className="p-3 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
              >
                <span>Show Hidden Dotfiles</span>
                <span className="font-mono-code" style={{ color: theme.ui.accent }}>
                  {settings.fileManager.showHiddenFiles ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSettings((s) => ({
                    ...s,
                    fileManager: {
                      ...s.fileManager,
                      confirmDelete: !s.fileManager.confirmDelete,
                    },
                  }))
                }
                className="p-3 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
              >
                <span>Confirm Before Deleting Files</span>
                <span className="font-mono-code" style={{ color: theme.ui.accent }}>
                  {settings.fileManager.confirmDelete ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW SETTINGS */}
        {activeTab === 'preview' && (
          <div
            className="rounded-2xl border p-5 space-y-4 text-xs"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h2 className="text-sm font-semibold">Live HTML Preview Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  updateSettings((s) => ({
                    ...s,
                    preview: { ...s.preview, autoRefresh: !s.preview.autoRefresh },
                  }))
                }
                className="p-3 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
              >
                <span>Auto-Reload on HTML / CSS / JS Changes</span>
                <span className="font-mono-code" style={{ color: theme.ui.accent }}>
                  {settings.preview.autoRefresh ? 'ON' : 'OFF'}
                </span>
              </button>

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
                className="p-3 rounded-xl border flex items-center justify-between"
                style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
              >
                <span>Execute JavaScript in Preview Sandbox</span>
                <span className="font-mono-code" style={{ color: theme.ui.accent }}>
                  {settings.preview.javascriptEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* BACKUP, RESTORE & STORAGE */}
        {activeTab === 'backup' && (
          <div className="space-y-5 text-xs">
            <section
              className="rounded-2xl border p-5 space-y-4"
              style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Backup, Restore &amp; Storage</h2>
                  <p className="mt-0.5 tabular-nums" style={{ color: theme.ui.textSecondary }}>
                    Local IndexedDB Usage: {formatBytes(storageEstimate.usedBytes)} / {formatBytes(storageEstimate.quotaBytes)} · {projects.length} projects · {files.length} files
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    createBackup(
                      `Snapshot ${new Date().toLocaleTimeString()}`,
                      'full'
                    )
                  }
                  className="h-9 px-4 rounded-lg font-semibold flex items-center gap-1.5"
                  style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Create Local Snapshot</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFullZipBackup}
                  className="h-9 px-3.5 rounded-lg border font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
                  style={{ borderColor: theme.ui.border }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Full ZIP Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportSettingsJson}
                  className="h-9 px-3.5 rounded-lg border font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
                  style={{ borderColor: theme.ui.border }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Settings JSON</span>
                </button>

                <label
                  className="h-9 px-3.5 rounded-lg border font-medium flex items-center gap-1.5 hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: theme.ui.border }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Backup JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const raw = await file.text();
                        const parsed = BackupService.parseBackupJson(raw);
                        setPendingRestorePayload(parsed);
                      } catch (err) {
                        pushToast(
                          'error',
                          'Invalid Backup File',
                          err instanceof Error ? err.message : 'Unable to parse backup JSON'
                        );
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </section>

            {/* Snapshot History */}
            <section
              className="rounded-2xl border p-5 space-y-3"
              style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
            >
              <h3 className="text-sm font-semibold">Saved Backup Snapshots ({backups.length})</h3>
              {backups.length === 0 ? (
                <p style={{ color: theme.ui.textSecondary }}>
                  No local backup snapshots created yet.
                </p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden" style={{ borderColor: theme.ui.border }}>
                  {backups.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 flex items-center justify-between gap-3"
                      style={{ backgroundColor: theme.ui.bgPrimary, borderColor: theme.ui.border }}
                    >
                      <div>
                        <div className="font-semibold">{snap.name}</div>
                        <div className="text-[11px] tabular-nums" style={{ color: theme.ui.textSecondary }}>
                          {snap.projectCount} projects · {snap.fileCount} files · {formatBytes(snap.sizeBytes)} · {formatRelativeTime(snap.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPendingRestoreSnap(snap)}
                          className="h-8 px-3 rounded-lg border font-medium hover:bg-slate-500/10"
                          style={{ borderColor: theme.ui.border }}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBackup(snap.id)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Safe Restore Confirmation Modal (Never overwrite user files without confirmation) */}
      {(pendingRestorePayload || pendingRestoreSnap) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
          >
            <h3 className="text-sm font-semibold">Confirm Workspace Restore</h3>
            <p className="text-xs leading-relaxed" style={{ color: theme.ui.textSecondary }}>
              Restoring this backup will replace your current workspace projects and settings with the saved snapshot. Proceed?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingRestorePayload(null);
                  setPendingRestoreSnap(null);
                }}
                className="h-9 px-3.5 rounded-lg text-xs hover:bg-slate-500/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pendingRestorePayload) {
                    await restoreFromPayload(pendingRestorePayload);
                    setPendingRestorePayload(null);
                  } else if (pendingRestoreSnap) {
                    await restoreBackup(pendingRestoreSnap.id);
                    setPendingRestoreSnap(null);
                  }
                }}
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
