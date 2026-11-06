import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserHtml from 'prettier/plugins/html';
import * as parserPostcss from 'prettier/plugins/postcss';
import * as parserTypescript from 'prettier/plugins/typescript';
import * as parserMarkdown from 'prettier/plugins/markdown';
import * as parserYaml from 'prettier/plugins/yaml';
import type { FormattingOptions, SupportedLanguageId } from '../types';

function resolvePrettierParser(languageId: SupportedLanguageId): string | null {
  switch (languageId) {
    case 'html':
    case 'xml':
    case 'svg':
      return 'html';
    case 'css':
      return 'css';
    case 'javascript':
    case 'jsx':
      return 'babel';
    case 'typescript':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'markdown':
      return 'markdown';
    case 'yaml':
      return 'yaml';
    default:
      return null;
  }
}

export class CodeFormatter {
  static isFormattable(languageId: SupportedLanguageId): boolean {
    return resolvePrettierParser(languageId) !== null;
  }

  static async formatCode(
    code: string,
    languageId: SupportedLanguageId,
    options: FormattingOptions
  ): Promise<{ formatted: string; changed: boolean; error?: string }> {
    const parser = resolvePrettierParser(languageId);
    if (!parser) {
      return {
        formatted: code,
        changed: false,
        error: `Prettier formatting is not supported for ${languageId.toUpperCase()} files.`,
      };
    }

    try {
      const formatted = await prettier.format(code, {
        parser,
        plugins: [
          parserBabel,
          parserEstree,
          parserHtml,
          parserPostcss,
          parserTypescript,
          parserMarkdown,
          parserYaml,
        ],
        tabWidth: options.tabWidth,
        semi: options.semi,
        singleQuote: options.singleQuote,
        trailingComma: options.trailingComma,
        printWidth: 90,
      });

      return {
        formatted,
        changed: formatted !== code,
      };
    } catch (err) {
      return {
        formatted: code,
        changed: false,
        error: err instanceof Error ? err.message : 'Syntax error prevented formatting',
      };
    }
  }
}
