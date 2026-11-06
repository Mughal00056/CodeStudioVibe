import { Capacitor } from '@capacitor/core';
import JSZip from 'jszip';
import type { VirtualFile } from '../types';
import { getBaseName, getParentPath } from '../utils/languageUtils';

interface NativeFileSystemPlugin {
  openDocumentTree(): Promise<{ treeUri: string; displayName: string }>;
  listTree(opts: { treeUri: string }): Promise<{
    files: Array<{ path: string; name: string; type: 'file' | 'folder'; size: number; lastModified: number }>;
  }>;
  readFile(opts: { treeUri: string; path: string }): Promise<{ content: string }>;
  writeFile(opts: { treeUri: string; path: string; content: string }): Promise<{ ok: boolean }>;
  deleteEntry(opts: { treeUri: string; path: string }): Promise<{ ok: boolean }>;
  renameEntry(opts: { treeUri: string; oldPath: string; newName: string }): Promise<{ ok: boolean }>;
}

interface NativeSharePlugin {
  shareFile(opts: { fileName: string; content: string; mimeType: string }): Promise<{ ok: boolean }>;
}

function getNativeFS(): NativeFileSystemPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins;
  return (plugins?.FileSystem as NativeFileSystemPlugin) || null;
}

function getNativeShare(): NativeSharePlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins;
  return (plugins?.Share as NativeSharePlugin) || null;
}

export class FileSystemService {
  static isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  static async openExternalFolder(): Promise<{
    mode: 'saf' | 'browser-fs' | 'unsupported';
    folderName?: string;
    treeUri?: string;
    files?: Record<string, string>;
  }> {
    const nativeFS = getNativeFS();
    if (nativeFS) {
      const res = await nativeFS.openDocumentTree();
      const listed = await nativeFS.listTree({ treeUri: res.treeUri });
      const files: Record<string, string> = {};
      for (const f of listed.files) {
        if (f.type === 'file' && f.size < 1_000_000) {
          const read = await nativeFS.readFile({ treeUri: res.treeUri, path: f.path });
          files[f.path] = read.content;
        }
      }
      return {
        mode: 'saf',
        folderName: res.displayName,
        treeUri: res.treeUri,
        files,
      };
    }

    // Modern Chromium File System Access API if available (outside restricted iframes)
    const win = window as unknown as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    };
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker();
        const files: Record<string, string> = {};
        await this.walkWebDirectoryHandle(dirHandle, '', files);
        return {
          mode: 'browser-fs',
          folderName: dirHandle.name,
          files,
        };
      } catch {
        // User cancelled or iframe restricted; caller can offer ZIP/folder upload fallback
      }
    }

    return { mode: 'unsupported' };
  }

  private static async walkWebDirectoryHandle(
    dirHandle: FileSystemDirectoryHandle,
    prefix: string,
    out: Record<string, string>,
    depth = 0
  ): Promise<void> {
    if (depth > 5) return;
    const entries = (dirHandle as unknown as {
      values(): AsyncIterable<FileSystemHandle>;
    }).values();

    for await (const handle of entries) {
      if (handle.name === 'node_modules' || handle.name === '.git') continue;
      const rel = prefix ? `${prefix}/${handle.name}` : handle.name;
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        if (file.size <= 1_000_000) {
          out[rel] = await file.text();
        }
      } else if (handle.kind === 'directory') {
        await this.walkWebDirectoryHandle(handle as FileSystemDirectoryHandle, rel, out, depth + 1);
      }
    }
  }

  static async syncProjectToServer(
    projectId: string,
    files: VirtualFile[],
    cleanRemoved = false
  ): Promise<string | null> {
    if (this.isNativeAndroid()) return null;
    try {
      const res = await fetch('/api/workspace/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          cleanRemoved,
          files: files.map((f) => ({
            path: f.path,
            type: f.type,
            content: f.content,
          })),
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { ok: boolean; workspacePath?: string };
      return data.workspacePath || null;
    } catch {
      return null;
    }
  }

  static async fetchProjectFromServer(projectId: string): Promise<VirtualFile[] | null> {
    if (this.isNativeAndroid()) return null;
    try {
      const res = await fetch(`/api/workspace/files?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        ok: boolean;
        files?: Array<{
          path: string;
          type: 'file' | 'folder';
          content: string;
          size: number;
          lastModified: number;
        }>;
      };
      if (!data.ok || !data.files) return null;

      return data.files.map((item) => ({
        id: `${item.type}_${projectId}_${item.path}`,
        projectId,
        path: item.path,
        name: getBaseName(item.path),
        parentPath: getParentPath(item.path),
        type: item.type,
        content: item.content,
        size: item.size,
        lastModified: item.lastModified,
        isHidden: getBaseName(item.path).startsWith('.'),
      }));
    } catch {
      return null;
    }
  }

  static async exportProjectZip(projectName: string, files: VirtualFile[]): Promise<Blob> {
    const zip = new JSZip();
    for (const entry of files) {
      if (entry.type === 'folder') {
        zip.folder(entry.path);
      } else {
        zip.file(entry.path, entry.content);
      }
    }
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  static async createZipFromSelection(files: VirtualFile[]): Promise<Blob> {
    const zip = new JSZip();
    for (const entry of files) {
      if (entry.type === 'folder') {
        zip.folder(entry.path);
      } else {
        zip.file(entry.path, entry.content);
      }
    }
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  static async extractZipArchive(
    arrayBuffer: ArrayBuffer
  ): Promise<Record<string, string>> {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const extracted: Record<string, string> = {};

    const entries = Object.values(zip.files);
    // Strip common single root folder if archive wraps everything in one directory
    const filePaths = entries.filter((e) => !e.dir).map((e) => e.name);
    let commonPrefix = '';
    if (filePaths.length > 0 && filePaths[0].includes('/')) {
      const candidate = filePaths[0].split('/')[0] + '/';
      if (filePaths.every((p) => p.startsWith(candidate))) {
        commonPrefix = candidate;
      }
    }

    for (const zipEntry of entries) {
      if (zipEntry.dir) continue;
      let cleanPath = zipEntry.name.replace(/^\/+/, '');
      if (commonPrefix && cleanPath.startsWith(commonPrefix)) {
        cleanPath = cleanPath.slice(commonPrefix.length);
      }
      if (!cleanPath || cleanPath.includes('..') || cleanPath.startsWith('.git/')) continue;
      const isBinary = /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|zip|tar|gz|pdf|apk|aab|jar|so)$/i.test(
        cleanPath
      );
      extracted[cleanPath] = isBinary ? '' : await zipEntry.async('string');
    }

    return extracted;
  }

  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  static async shareOrDownloadFile(fileName: string, content: string): Promise<'shared' | 'downloaded'> {
    const nativeShare = getNativeShare();
    if (nativeShare) {
      await nativeShare.shareFile({
        fileName,
        content,
        mimeType: 'text/plain',
      });
      return 'shared';
    }

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([content], fileName, { type: 'text/plain' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: fileName, files: [file] });
          return 'shared';
        }
      } catch {
        // Fallback to download
      }
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, fileName);
    return 'downloaded';
  }
}
