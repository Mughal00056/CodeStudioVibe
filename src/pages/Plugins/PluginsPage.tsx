import React, { useMemo, useState } from 'react';
import { Check, Lock, Package, Play, Search, Shield, Trash2 } from 'lucide-react';
import type { PluginDefinition, PluginPermission } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { PluginService } from '../../services/PluginService';

const ALL_PERMISSIONS: Array<{ id: PluginPermission; label: string }> = [
  { id: 'editor:read', label: 'Read Active Editor Buffer' },
  { id: 'editor:write', label: 'Modify Active Editor Buffer' },
  { id: 'files:read', label: 'Read Project Files' },
  { id: 'files:write', label: 'Write Project Files' },
  { id: 'command:register', label: 'Register Palette Commands' },
  { id: 'toolbar:register', label: 'Add Editor Toolbar Actions' },
  { id: 'theme:register', label: 'Register Color Themes' },
  { id: 'preview:read', label: 'Inspect Preview DOM' },
  { id: 'network:fetch', label: 'Network Requests' },
];

export const PluginsPage: React.FC = () => {
  const theme = useIDETheme();
  const pluginStates = useIDEStore((s) => s.pluginStates);
  const installPlugin = useIDEStore((s) => s.installPlugin);
  const uninstallPlugin = useIDEStore((s) => s.uninstallPlugin);
  const togglePluginEnabled = useIDEStore((s) => s.togglePluginEnabled);
  const togglePluginPermission = useIDEStore((s) => s.togglePluginPermission);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const formatTabWithPrettier = useIDEStore((s) => s.formatTabWithPrettier);
  const updateTabContent = useIDEStore((s) => s.updateTabContent);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginDefinition | null>(null);

  const catalog = useMemo(() => PluginService.getAllKnownPlugins(), []);

  const filtered = catalog.filter((p) => {
    const matchCat = category === 'All' || p.category === category;
    const matchQuery =
      !query.trim() ||
      p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      p.description.toLowerCase().includes(query.trim().toLowerCase());
    return matchCat && matchQuery;
  });

  const executePluginCommand = async (plugin: PluginDefinition) => {
    const st = pluginStates[plugin.id];
    if (!st || !st.installed || !st.enabled) {
      pushToast('warning', 'Plugin disabled', `Enable ${plugin.name} first.`);
      return;
    }

    const activeTab = openTabs.find((t) => t.id === activeTabId);
    if (!activeTab) {
      pushToast('info', 'Open a file in Editor to run this plugin');
      return;
    }

    if (plugin.id === 'plugin-prettier') {
      await formatTabWithPrettier(activeTab.id);
    } else if (plugin.id === 'plugin-eslint') {
      if (!PluginService.hasPermission(pluginStates, plugin.id, 'editor:read')) {
        pushToast('warning', 'Permission denied', 'Grant editor:read permission to ESLint.');
        return;
      }
      const issues = PluginService.runESLintAnalysis(activeTab.content);
      pushToast(
        issues.length === 0 ? 'success' : 'warning',
        `ESLint: ${issues.length} issue(s)`,
        issues[0]?.message || 'Clean file'
      );
    } else if (plugin.id === 'plugin-emmet') {
      if (!PluginService.hasPermission(pluginStates, plugin.id, 'editor:write')) {
        pushToast('warning', 'Permission denied', 'Grant editor:write permission to Emmet.');
        return;
      }
      const expanded = PluginService.expandEmmet('section.hero>h1+p');
      if (expanded) {
        updateTabContent(activeTab.id, activeTab.content + '\n' + expanded);
        pushToast('success', 'Emmet inserted expanded HTML block');
      }
    } else if (plugin.id === 'plugin-markdown-tools') {
      const toc = PluginService.generateMarkdownTOC(activeTab.content);
      updateTabContent(activeTab.id, toc + activeTab.content);
      pushToast('success', 'Inserted Markdown Table of Contents');
    } else if (plugin.id === 'plugin-svg-optimizer') {
      const min = PluginService.minifySvg(activeTab.content);
      updateTabContent(activeTab.id, min);
      pushToast('success', 'Minified SVG markup');
    } else if (plugin.id === 'plugin-env-validator') {
      const sorted = PluginService.sortEnvKeys(activeTab.content);
      updateTabContent(activeTab.id, sorted);
      pushToast('success', 'Sorted environment keys');
    } else {
      pushToast('success', `Executed ${plugin.name}`);
    }
  };

  return (
    <div
      className="h-full w-full overflow-y-auto px-4 sm:px-6 lg:px-10 py-6"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Plugin Manager &amp; Permissions</h1>
            <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
              Plugins run inside a restricted sandbox and require explicit permission grants for editor and file APIs.
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: theme.ui.textSecondary }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plugins..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgSecondary,
                borderColor: theme.ui.border,
              }}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['All', 'Formatter', 'Productivity', 'Linter', 'Markdown', 'Design', 'Git', 'Snippets', 'Utilities'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor:
                      category === cat ? theme.ui.bgElevated : theme.ui.bgSecondary,
                    color: category === cat ? theme.ui.accent : theme.ui.textSecondary,
                  }}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Plugins Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((plugin) => {
            const st = pluginStates[plugin.id] || {
              pluginId: plugin.id,
              installed: false,
              enabled: false,
              grantedPermissions: [],
            };

            return (
              <div
                key={plugin.id}
                className="rounded-2xl border p-4 flex flex-col justify-between gap-4"
                style={{
                  backgroundColor: theme.ui.bgSecondary,
                  borderColor: theme.ui.border,
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 shrink-0" style={{ color: theme.ui.accent }} />
                        <h3 className="text-sm font-semibold">{plugin.name}</h3>
                      </div>
                      <div
                        className="text-[11px] mt-0.5 tabular-nums"
                        style={{ color: theme.ui.textSecondary }}
                      >
                        v{plugin.version} · {plugin.author} · {plugin.category}
                      </div>
                    </div>

                    <span
                      className="text-[11px] font-mono-code shrink-0"
                      style={{
                        color: !st.installed
                          ? theme.ui.textSecondary
                          : st.enabled
                            ? '#22C55E'
                            : '#F59E0B',
                      }}
                    >
                      {!st.installed ? 'Available' : st.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: theme.ui.textSecondary }}>
                    {plugin.description}
                  </p>

                  <div className="text-[11px] font-mono-code" style={{ color: theme.ui.textSecondary }}>
                    Permissions ({st.grantedPermissions.length}/{plugin.permissions.length}):{' '}
                    {plugin.permissions.join(', ')}
                  </div>
                </div>

                <div
                  className="pt-3 border-t flex flex-wrap items-center justify-between gap-2"
                  style={{ borderColor: theme.ui.border }}
                >
                  <div className="flex items-center gap-2">
                    {st.installed ? (
                      <>
                        <button
                          type="button"
                          onClick={() => togglePluginEnabled(plugin.id)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: st.enabled ? theme.ui.bgElevated : theme.ui.accent,
                            color: st.enabled ? theme.ui.textPrimary : theme.ui.accentText,
                          }}
                        >
                          {st.enabled ? 'Disable' : 'Enable'}
                        </button>

                        {st.enabled && (
                          <button
                            type="button"
                            onClick={() => executePluginCommand(plugin)}
                            className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1 hover:bg-slate-500/10"
                            style={{ borderColor: theme.ui.border }}
                          >
                            <Play className="w-3 h-3" />
                            <span>Run</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => installPlugin(plugin.id)}
                        className="h-8 px-4 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                      >
                        Install Plugin
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPlugin(plugin)}
                      className="h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 hover:bg-slate-500/10"
                      style={{ borderColor: theme.ui.border }}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Permissions</span>
                    </button>

                    {st.installed && !plugin.isDefault && (
                      <button
                        type="button"
                        onClick={() => uninstallPlugin(plugin.id)}
                        title="Uninstall Plugin"
                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plugin Permissions Modal */}
      {selectedPlugin && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPlugin(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: theme.ui.bgSecondary, borderColor: theme.ui.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" style={{ color: theme.ui.accent }} />
              <h3 className="text-sm font-semibold">{selectedPlugin.name} — Sandbox Permissions</h3>
            </div>

            <p className="text-xs" style={{ color: theme.ui.textSecondary }}>
              Toggle allowed sandbox capabilities for this plugin. Revoking a permission immediately blocks restricted API calls.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ALL_PERMISSIONS.filter((p) => selectedPlugin.permissions.includes(p.id)).map((perm) => {
                const st = pluginStates[selectedPlugin.id];
                const granted = st?.grantedPermissions.includes(perm.id) || false;
                return (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => togglePluginPermission(selectedPlugin.id, perm.id)}
                    className="w-full p-2.5 rounded-xl border flex items-center justify-between text-left text-xs"
                    style={{
                      backgroundColor: theme.ui.bgPrimary,
                      borderColor: granted ? theme.ui.accent : theme.ui.border,
                    }}
                  >
                    <div>
                      <div className="font-medium">{perm.label}</div>
                      <div className="font-mono-code text-[11px]" style={{ color: theme.ui.textSecondary }}>
                        {perm.id}
                      </div>
                    </div>
                    <span
                      className="h-5 w-5 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: granted ? theme.ui.accent : 'transparent',
                        color: granted ? theme.ui.accentText : theme.ui.textSecondary,
                      }}
                    >
                      {granted && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlugin(null)}
                className="h-9 px-4 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
