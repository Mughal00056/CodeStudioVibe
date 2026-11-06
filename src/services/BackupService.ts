import JSZip from 'jszip';
import type {
  AppSettings,
  BackupSnapshot,
  IDETheme,
  PluginState,
  Project,
  VirtualFile,
} from '../types';

export interface WorkspaceBackupPayload {
  schemaVersion: 1;
  exportedAt: number;
  app: 'CodeX Studio';
  projects: Project[];
  files: VirtualFile[];
  settings: AppSettings;
  customThemes: IDETheme[];
  pluginStates: Record<string, PluginState>;
}

export class BackupService {
  static createBackupPayload(data: {
    projects: Project[];
    files: VirtualFile[];
    settings: AppSettings;
    customThemes: IDETheme[];
    pluginStates: Record<string, PluginState>;
  }): WorkspaceBackupPayload {
    return {
      schemaVersion: 1,
      exportedAt: Date.now(),
      app: 'CodeX Studio',
      projects: data.projects,
      files: data.files,
      settings: data.settings,
      customThemes: data.customThemes,
      pluginStates: data.pluginStates,
    };
  }

  static createSnapshotRecord(
    name: string,
    type: 'full' | 'project' | 'settings',
    payload: WorkspaceBackupPayload,
    projectId?: string
  ): BackupSnapshot {
    const json = JSON.stringify(payload);
    return {
      id: `bak_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      projectId,
      createdAt: Date.now(),
      sizeBytes: new TextEncoder().encode(json).length,
      projectCount: payload.projects.length,
      fileCount: payload.files.length,
      payloadJson: json,
    };
  }

  static async createZipBackupBlob(payload: WorkspaceBackupPayload): Promise<Blob> {
    const zip = new JSZip();
    zip.file('codex-backup-manifest.json', JSON.stringify(payload, null, 2));

    for (const proj of payload.projects) {
      const folderName = proj.name.replace(/[^a-zA-Z0-9._-]/g, '_') || proj.id;
      const projFiles = payload.files.filter((f) => f.projectId === proj.id);
      for (const f of projFiles) {
        if (f.type === 'folder') {
          zip.folder(`projects/${folderName}/${f.path}`);
        } else {
          zip.file(`projects/${folderName}/${f.path}`, f.content);
        }
      }
    }

    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  static parseBackupJson(rawText: string): WorkspaceBackupPayload {
    const parsed = JSON.parse(rawText) as Partial<WorkspaceBackupPayload>;
    if (!parsed || parsed.app !== 'CodeX Studio' || !Array.isArray(parsed.projects) || !Array.isArray(parsed.files)) {
      throw new Error('Invalid CodeX Studio backup archive format.');
    }
    return parsed as WorkspaceBackupPayload;
  }
}
