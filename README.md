# CodeX Studio — Android & Web Mobile IDE

**Version:** 1.0.0  
**Minimum Android:** Android 9.0 (API 28)  
**Target Architecture:** ARM64 (`arm64-v8a`), `armeabi-v7a`, and Web  
**Stack:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, CodeMirror 6, xterm.js, Prettier, JSZip, DOMPurify, Diff, Capacitor 6, Kotlin

---

## Key Capabilities

- **CodeMirror 6 Multi-Language Editor**: Syntax highlighting, autocomplete, auto-indentation, auto-closing brackets and tags, code folding, word wrap, line numbers, optional minimap, multiple tabs, reopen closed tab, find & replace (case, whole-word, regex), go to line, and Prettier code formatting.
- **26+ Supported Languages**: HTML, CSS, JavaScript, TypeScript, JSX, TSX, JSON, XML, SVG, Java, Kotlin, Python, C, C++, Rust, Go, PHP, Ruby, Markdown, YAML, SQL, Shell, Gradle, Properties, TOML, and Plain Text.
- **File Explorer & Storage Access Framework (SAF)**: Create/rename/delete/copy/cut/paste/move files and folders, multi-select batch actions, sort & hidden dotfiles toggle, ZIP creation and extraction (`JSZip`), file import/export, and native Android SAF (`ACTION_OPEN_DOCUMENT_TREE`) with persisted URI permissions.
- **Integrated Terminal (`xterm.js`)**: Multi-session terminal tabs, command history, working directory tracking, copy/paste, fullscreen mode, process termination (`SIGKILL`), Android native shell / Termux bridge (`TerminalPlugin.kt`), and Linux shell bridge (`server.ts`).
- **Live HTML / CSS / JS Preview**: Responsive, mobile, desktop, and custom viewport dimensions, automatic live reload on edit, navigation history, JavaScript execution toggle with `DOMPurify` sandboxing, and live console/error forwarding.
- **Git & GitHub Integration**: Local repository initialization, working tree status, stage/unstage, commit history, branch creation/checkout/merge, unified diff hunks (`diff`), GitHub token connection, repository search, and cloning.
- **Plugin Manager & Permissions**: Sandboxed extensions (`Prettier`, `Emmet`, `ESLint`, `Markdown Tools`, `Color Picker`, `Git Tools`, `Code Snippets`, `Local Code Refactoring Assistant`) with per-plugin permission grants (`editor:read`, `editor:write`, `files:read`, `files:write`, `command:register`, `toolbar:register`, etc.).
- **Themes, Backup & Low-RAM Optimization**: 8 built-in themes (`Dark`, `Light`, `Dracula`, `Monokai Pro`, `One Dark`, `GitHub Dark`, `Nord`, `Solarized Dark`), Custom Theme Builder, IndexedDB persistence, and ZIP/JSON workspace backup and restore.

---

## Project Structure

```
CodeXStudio/
├── src/
│   ├── components/
│   │   ├── BottomNavigation/
│   │   ├── CommandPalette/
│   │   ├── ContextMenu/
│   │   ├── Dialogs/
│   │   ├── EditorTabs/
│   │   ├── EditorToolbar/
│   │   ├── FileExplorer/
│   │   ├── Header/
│   │   ├── Preview/
│   │   ├── SearchPanel/
│   │   ├── Sidebar/
│   │   ├── StatusBar/
│   │   └── Terminal/
│   ├── pages/
│   │   ├── Home/
│   │   ├── Editor/
│   │   ├── Projects/
│   │   ├── Terminal/
│   │   ├── Preview/
│   │   ├── Plugins/
│   │   ├── GitHub/
│   │   └── Settings/
│   ├── editor/
│   │   ├── Autocomplete.ts
│   │   ├── CodeEditor.tsx
│   │   ├── CodeFormatter.ts
│   │   ├── EditorConfig.ts
│   │   ├── EditorExtensions.ts
│   │   ├── EditorThemes.ts
│   │   ├── LanguageSupport.ts
│   │   └── SyntaxHighlight.ts
│   ├── services/
│   │   ├── BackupService.ts
│   │   ├── FileSystem.ts
│   │   ├── GitService.ts
│   │   ├── PluginService.ts
│   │   ├── PreviewService.ts
│   │   ├── StorageService.ts
│   │   └── TerminalService.ts
│   ├── context/
│   ├── hooks/
│   ├── plugins/
│   ├── store/
│   ├── themes/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   ├── proguard-rules.pro
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/codexstudio/
│   │       │   ├── FileSystemPlugin.kt
│   │       │   ├── MainActivity.kt
│   │       │   ├── PermissionManager.kt
│   │       │   ├── SharePlugin.kt
│   │       │   └── TerminalPlugin.kt
│   │       └── res/
│   ├── build.gradle
│   ├── gradle.properties
│   └── settings.gradle
├── server.ts
├── capacitor.config.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Build & Run Instructions

### 1. Web & Full-Stack Development Server

```bash
npm install
npm run dev
```

The Express + Vite server runs on `http://localhost:3000` with real shell terminal execution, toolchain probing, and workspace synchronization.

### 2. Production Web Bundle

```bash
npm run build
npm start
```

### 3. Android APK & App Bundle (AAB) Build

Prerequisites: JDK 17+, Android SDK (API 28–34), and Gradle 8+.

1. Build the production web assets and sync into Capacitor Android assets:
   ```bash
   npm run build
   npx cap sync android
   ```
2. Build a **Debug APK**:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   Output: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Build a **Release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   Output: `android/app/build/outputs/apk/release/app-release-unsigned.apk` (sign with `apksigner` using your release keystore).
4. Build an **Android App Bundle (AAB)** for Google Play:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`
