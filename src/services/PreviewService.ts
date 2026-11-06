import DOMPurify from 'dompurify';
import type { VirtualFile } from '../types';

export interface BuiltPreviewBundle {
  html: string;
  entryFile: string;
  inlinedAssets: string[];
}

export class PreviewService {
  static buildPreviewDocument(
    files: VirtualFile[],
    preferredEntryPath?: string,
    javascriptEnabled = true
  ): BuiltPreviewBundle {
    const fileMap = new Map<string, VirtualFile>();
    for (const f of files) {
      if (f.type === 'file') {
        fileMap.set(f.path, f);
      }
    }

    let entryFile =
      (preferredEntryPath &&
        preferredEntryPath.endsWith('.html') &&
        fileMap.has(preferredEntryPath) &&
        preferredEntryPath) ||
      (fileMap.has('index.html') ? 'index.html' : '');

    if (!entryFile) {
      const firstHtml = files.find((f) => f.type === 'file' && /\.(html|htm)$/i.test(f.name));
      if (firstHtml) entryFile = firstHtml.path;
    }

    // If project is CSS/JS/Markdown/SVG only, synthesize an intelligent preview wrapper
    if (!entryFile) {
      const cssFiles = files.filter((f) => f.type === 'file' && f.name.endsWith('.css'));
      const jsFiles = files.filter((f) => f.type === 'file' && f.name.endsWith('.js'));
      const svgFile = files.find((f) => f.type === 'file' && f.name.endsWith('.svg'));

      if (svgFile) {
        return {
          entryFile: svgFile.path,
          inlinedAssets: [svgFile.path],
          html: this.injectBridge(
            `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;">${svgFile.content}</body></html>`,
            javascriptEnabled
          ),
        };
      }

      const stylesTag = cssFiles.map((c) => `<style data-file="${c.path}">\n${c.content}\n</style>`).join('\n');
      const scriptsTag = javascriptEnabled
        ? jsFiles.map((j) => `<script data-file="${j.path}">\n${j.content}\n</script>`).join('\n')
        : '';

      const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Preview</title>
  ${stylesTag}
</head>
<body style="font-family: system-ui, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc;">
  <main style="max-width: 640px; margin: 0 auto;">
    <h2 style="margin-bottom: 8px;">Workspace Preview</h2>
    <p style="color: #94a3b8; font-size: 14px;">No index.html found in root. Active stylesheets and scripts are loaded below.</p>
    <div id="output" style="margin-top: 16px;"></div>
  </main>
  ${scriptsTag}
</body>
</html>`;
      return {
        entryFile: 'generated-preview.html',
        inlinedAssets: [...cssFiles.map((c) => c.path), ...jsFiles.map((j) => j.path)],
        html: this.injectBridge(fallbackHtml, javascriptEnabled),
      };
    }

    let rawHtml = fileMap.get(entryFile)?.content || '';
    const inlinedAssets: string[] = [entryFile];
    const baseDir = entryFile.includes('/') ? entryFile.slice(0, entryFile.lastIndexOf('/')) : '';

    const resolveRelative = (ref: string): string => {
      const clean = ref.split('?')[0].split('#')[0].replace(/^\.\//, '');
      if (!baseDir) return clean;
      if (clean.startsWith('/')) return clean.slice(1);
      return `${baseDir}/${clean}`;
    };

    // Inline <link rel="stylesheet" href="...">
    rawHtml = rawHtml.replace(
      /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (match, href: string) => {
        if (/^https?:\/\//i.test(href)) return match;
        const resolved = resolveRelative(href);
        const cssFile = fileMap.get(resolved) || fileMap.get(href);
        if (cssFile) {
          inlinedAssets.push(cssFile.path);
          return `<style data-source="${cssFile.path}">\n${cssFile.content}\n</style>`;
        }
        return match;
      }
    );

    // Inline <script src="..."></script>
    rawHtml = rawHtml.replace(
      /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
      (match, src: string) => {
        if (!javascriptEnabled) return '';
        if (/^https?:\/\//i.test(src)) return match;
        const resolved = resolveRelative(src);
        const jsFile = fileMap.get(resolved) || fileMap.get(src);
        if (jsFile) {
          inlinedAssets.push(jsFile.path);
          return `<script data-source="${jsFile.path}">\n${jsFile.content}\n</script>`;
        }
        return match;
      }
    );

    if (!javascriptEnabled) {
      rawHtml = DOMPurify.sanitize(rawHtml, { WHOLE_DOCUMENT: true });
    }

    return {
      entryFile,
      inlinedAssets,
      html: this.injectBridge(rawHtml, javascriptEnabled),
    };
  }

  private static injectBridge(html: string, javascriptEnabled: boolean): string {
    if (!javascriptEnabled) return html;

    const consoleScript = `<script>
(function() {
  function post(level, args) {
    try {
      var text = Array.prototype.slice.call(args).map(function(a) {
        if (typeof a === 'object' && a !== null) {
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(' ');
      window.parent.postMessage({ source: 'codex-preview', level: level, message: text }, '*');
    } catch (e) {}
  }
  var origLog = console.log;
  var origWarn = console.warn;
  var origErr = console.error;
  console.log = function() { post('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { post('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { post('error', arguments); origErr.apply(console, arguments); };
  window.addEventListener('error', function(ev) {
    post('error', [ev.message + (ev.lineno ? ' (line ' + ev.lineno + ')' : '')]);
  });
})();
</script>`;

    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>\n${consoleScript}`);
    }
    if (html.includes('<body>')) {
      return html.replace('<body>', `<body>\n${consoleScript}`);
    }
    return `${consoleScript}\n${html}`;
  }
}
