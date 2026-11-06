import type { Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { kotlin } from '@codemirror/legacy-modes/mode/clike';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { properties } from '@codemirror/legacy-modes/mode/properties';
import type { SupportedLanguageId } from '../types';

export function getLanguageExtension(
  languageId: SupportedLanguageId,
  autoCloseTags = true
): Extension {
  switch (languageId) {
    case 'html':
      return html({ autoCloseTags, matchClosingTags: true });
    case 'css':
      return css();
    case 'javascript':
      return javascript({ jsx: false, typescript: false });
    case 'jsx':
      return javascript({ jsx: true, typescript: false });
    case 'typescript':
      return javascript({ jsx: false, typescript: true });
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'json':
      return json();
    case 'xml':
    case 'svg':
      return xml();
    case 'java':
      return java();
    case 'kotlin':
      return StreamLanguage.define(kotlin);
    case 'python':
      return python();
    case 'c':
    case 'cpp':
      return cpp();
    case 'rust':
      return rust();
    case 'go':
      return go();
    case 'php':
      return php();
    case 'ruby':
      return StreamLanguage.define(ruby);
    case 'markdown':
      return markdown();
    case 'yaml':
      return yaml();
    case 'sql':
      return sql();
    case 'shell':
      return StreamLanguage.define(shell);
    case 'gradle':
      return StreamLanguage.define(groovy);
    case 'properties':
      return StreamLanguage.define(properties);
    case 'toml':
      return StreamLanguage.define(toml);
    case 'plaintext':
    default:
      return [];
  }
}
