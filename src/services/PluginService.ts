import type { PluginDefinition, PluginPermission, PluginState } from '../types';
import {
  COMMUNITY_PLUGIN_CATALOG,
  DEFAULT_PLUGINS,
  expandEmmetExpression,
} from '../plugins/defaultPlugins';

export interface PluginDiagnostic {
  line: number;
  severity: 'warning' | 'error';
  message: string;
  rule: string;
}

export class PluginService {
  static getAllKnownPlugins(customPlugins: PluginDefinition[] = []): PluginDefinition[] {
    return [...DEFAULT_PLUGINS, ...COMMUNITY_PLUGIN_CATALOG, ...customPlugins];
  }

  static hasPermission(
    states: Record<string, PluginState>,
    pluginId: string,
    permission: PluginPermission
  ): boolean {
    const state = states[pluginId];
    if (!state || !state.installed || !state.enabled) return false;
    return state.grantedPermissions.includes(permission);
  }

  static runESLintAnalysis(code: string): PluginDiagnostic[] {
    const diagnostics: PluginDiagnostic[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      if (/\bvar\s+[a-zA-Z_$]/.test(line)) {
        diagnostics.push({
          line: lineNum,
          severity: 'warning',
          message: 'Unexpected var, use let or const instead.',
          rule: 'no-var',
        });
      }
      if (/\bdebugger\b/.test(line)) {
        diagnostics.push({
          line: lineNum,
          severity: 'error',
          message: 'Unexpected debugger statement.',
          rule: 'no-debugger',
        });
      }
      if (/==(?!=)/.test(line) && !/===/.test(line) && !line.trim().startsWith('//')) {
        diagnostics.push({
          line: lineNum,
          severity: 'warning',
          message: 'Expected === and instead saw ==.',
          rule: 'eqeqeq',
        });
      }
      if (/\beval\s*\(/.test(line)) {
        diagnostics.push({
          line: lineNum,
          severity: 'error',
          message: 'eval can be harmful and violates security policy.',
          rule: 'no-eval',
        });
      }
    });

    return diagnostics;
  }

  static generateMarkdownTOC(markdown: string): string {
    const headings: Array<{ level: number; text: string; slug: string }> = [];
    const lines = markdown.split('\n');
    for (const line of lines) {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const slug = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        headings.push({ level, text, slug });
      }
    }
    if (headings.length === 0) {
      return '<!-- No headings found for Table of Contents -->\n';
    }
    const tocLines = headings.map(
      (h) => `${'  '.repeat(h.level - 1)}- [${h.text}](#${h.slug})`
    );
    return `## Table of Contents\n\n${tocLines.join('\n')}\n\n`;
  }

  static expandEmmet(abbreviation: string): string | null {
    return expandEmmetExpression(abbreviation);
  }

  static minifySvg(svg: string): string {
    return svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  static sortEnvKeys(content: string): string {
    const lines = content.split('\n');
    const kvLines = lines.filter((l) => l.trim() && !l.trim().startsWith('#'));
    const comments = lines.filter((l) => l.trim().startsWith('#'));
    kvLines.sort((a, b) => a.localeCompare(b));
    return [...comments, ...kvLines].join('\n') + '\n';
  }
}
