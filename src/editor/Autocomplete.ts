import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { SupportedLanguageId } from '../types';

const COMMON_SNIPPETS: Record<string, Completion[]> = {
  html: [
    { label: 'div', type: 'keyword', apply: '<div class=""></div>', detail: 'HTML element' },
    { label: 'section', type: 'keyword', apply: '<section>\n  \n</section>', detail: 'Section block' },
    { label: 'button', type: 'keyword', apply: '<button type="button"></button>', detail: 'Button element' },
    { label: 'link:css', type: 'snippet', apply: '<link rel="stylesheet" href="styles.css" />', detail: 'Stylesheet link' },
    { label: 'script:src', type: 'snippet', apply: '<script src="app.js"></script>', detail: 'External script' },
    { label: 'viewport', type: 'snippet', apply: '<meta name="viewport" content="width=device-width, initial-scale=1.0" />', detail: 'Mobile viewport' },
  ],
  css: [
    { label: 'display: flex', type: 'property', apply: 'display: flex;\nalign-items: center;\njustify-content: space-between;', detail: 'Flex container' },
    { label: 'display: grid', type: 'property', apply: 'display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\ngap: 16px;', detail: 'Responsive grid' },
    { label: 'var(--)', type: 'function', apply: 'var(--)', detail: 'CSS custom property' },
    { label: '@media', type: 'keyword', apply: '@media (max-width: 768px) {\n  \n}', detail: 'Responsive media query' },
  ],
  javascript: [
    { label: 'console.log', type: 'function', apply: 'console.log()', detail: 'Log to console' },
    { label: 'async function', type: 'keyword', apply: 'async function name() {\n  \n}', detail: 'Async declaration' },
    { label: 'fetch', type: 'function', apply: "const res = await fetch('');\nconst data = await res.json();", detail: 'Fetch JSON' },
    { label: 'addEventListener', type: 'method', apply: "addEventListener('click', (event) => {\n  \n});", detail: 'DOM event listener' },
    { label: 'try/catch', type: 'keyword', apply: 'try {\n  \n} catch (error) {\n  console.error(error);\n}', detail: 'Error handling' },
  ],
  typescript: [
    { label: 'interface', type: 'keyword', apply: 'export interface Name {\n  id: string;\n}', detail: 'TypeScript interface' },
    { label: 'type', type: 'keyword', apply: 'export type Status = "idle" | "loading" | "ready";', detail: 'Union type' },
    { label: 'useState', type: 'function', apply: 'const [state, setState] = useState();', detail: 'React state hook' },
    { label: 'useEffect', type: 'function', apply: 'useEffect(() => {\n  \n}, []);', detail: 'React effect hook' },
  ],
  python: [
    { label: 'def', type: 'keyword', apply: 'def function_name(param):\n    pass', detail: 'Function definition' },
    { label: 'class', type: 'keyword', apply: 'class ClassName:\n    def __init__(self):\n        pass', detail: 'Class definition' },
    { label: 'if __name__', type: 'snippet', apply: 'if __name__ == "__main__":\n    main()', detail: 'Main entrypoint' },
    { label: 'print', type: 'function', apply: 'print()', detail: 'Print to stdout' },
  ],
  kotlin: [
    { label: 'fun', type: 'keyword', apply: 'fun functionName() {\n    \n}', detail: 'Kotlin function' },
    { label: 'data class', type: 'keyword', apply: 'data class Model(val id: String, val name: String)', detail: 'Data class' },
    { label: 'override fun onCreate', type: 'method', apply: 'override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(savedInstanceState)\n}', detail: 'Android lifecycle' },
    { label: 'Log.d', type: 'function', apply: 'Log.d("CodeX", "")', detail: 'Android debug log' },
  ],
  java: [
    { label: 'public class', type: 'keyword', apply: 'public class Main {\n    public static void main(String[] args) {\n        \n    }\n}', detail: 'Java main class' },
    { label: 'System.out.println', type: 'function', apply: 'System.out.println();', detail: 'Print line' },
  ],
  rust: [
    { label: 'fn main', type: 'keyword', apply: 'fn main() {\n    println!("Hello, CodeX!");\n}', detail: 'Rust entrypoint' },
    { label: 'struct', type: 'keyword', apply: 'struct Config {\n    name: String,\n}', detail: 'Struct definition' },
  ],
  go: [
    { label: 'func main', type: 'keyword', apply: 'func main() {\n\tfmt.Println("Ready")\n}', detail: 'Go entrypoint' },
    { label: 'if err != nil', type: 'snippet', apply: 'if err != nil {\n\treturn err\n}', detail: 'Error check' },
  ],
  php: [
    { label: '<?php', type: 'keyword', apply: '<?php\ndeclare(strict_types=1);\n\n', detail: 'PHP strict header' },
    { label: 'json_encode', type: 'function', apply: 'echo json_encode($data, JSON_PRETTY_PRINT);', detail: 'JSON output' },
  ],
  sql: [
    { label: 'SELECT', type: 'keyword', apply: 'SELECT * FROM table_name WHERE id = 1;', detail: 'Query rows' },
    { label: 'CREATE TABLE', type: 'keyword', apply: 'CREATE TABLE items (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);', detail: 'Create table' },
  ],
  shell: [
    { label: '#!/usr/bin/env bash', type: 'keyword', apply: '#!/usr/bin/env bash\nset -euo pipefail\n\n', detail: 'Bash strict header' },
  ],
};

export function createAutocompleteExtension(languageId: SupportedLanguageId): Extension {
  const normalizedLang =
    languageId === 'jsx'
      ? 'javascript'
      : languageId === 'tsx'
        ? 'typescript'
        : languageId;

  const customSource = (context: CompletionContext) => {
    const word = context.matchBefore(/[\w:@.-]+/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const pool: Completion[] = [
      ...(COMMON_SNIPPETS[normalizedLang] || []),
      ...(normalizedLang === 'typescript' ? COMMON_SNIPPETS.javascript : []),
    ];

    if (pool.length === 0) return null;
    return {
      from: word.from,
      options: pool,
    };
  };

  return autocompletion({
    override: [customSource],
    activateOnTyping: true,
    maxRenderedOptions: 20,
  });
}
