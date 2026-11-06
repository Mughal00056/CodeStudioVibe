import { createPatch } from 'diff';
import type { GitCommit, GitHubRepo, GitHubUser, GitStatusEntry, VirtualFile } from '../types';
import { StorageService } from './StorageService';

export interface LocalGitRepoState {
  projectId: string;
  initialized: boolean;
  currentBranch: string;
  branches: string[];
  remoteUrl?: string;
  stagedPaths: string[];
  committedSnapshot: Record<string, string>;
  commits: GitCommit[];
}

const GIT_STORAGE_KEY = 'git_repos_v1';
const GITHUB_USER_KEY = 'github_user_v1';
const GITHUB_TOKEN_KEY = 'github_token_session_v1';

export class GitService {
  private static async loadRepoMap(): Promise<Record<string, LocalGitRepoState>> {
    return StorageService.getItem<Record<string, LocalGitRepoState>>(GIT_STORAGE_KEY, {});
  }

  private static async saveRepoMap(map: Record<string, LocalGitRepoState>): Promise<void> {
    await StorageService.setItem(GIT_STORAGE_KEY, map);
  }

  static async getRepoState(projectId: string, files: VirtualFile[]): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    if (map[projectId]) {
      return map[projectId];
    }
    const initialSnapshot: Record<string, string> = {};
    for (const f of files) {
      if (f.type === 'file') {
        initialSnapshot[f.path] = f.content;
      }
    }
    const created: LocalGitRepoState = {
      projectId,
      initialized: true,
      currentBranch: 'main',
      branches: ['main'],
      stagedPaths: [],
      committedSnapshot: initialSnapshot,
      commits: [
        {
          hash: Math.random().toString(16).slice(2, 9),
          message: 'Initial project commit',
          author: 'CodeX Developer',
          email: 'developer@codexstudio.local',
          timestamp: Date.now() - 60_000,
          branch: 'main',
          filesChanged: Object.keys(initialSnapshot).length,
        },
      ],
    };
    map[projectId] = created;
    await this.saveRepoMap(map);
    return created;
  }

  static async initRepo(projectId: string): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const state: LocalGitRepoState = map[projectId] || {
      projectId,
      initialized: true,
      currentBranch: 'main',
      branches: ['main'],
      stagedPaths: [],
      committedSnapshot: {},
      commits: [],
    };
    state.initialized = true;
    map[projectId] = state;
    await this.saveRepoMap(map);

    await fetch('/api/git/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, args: ['init', '-b', 'main'] }),
    }).catch(() => {});

    return state;
  }

  static computeWorkingStatus(
    repo: LocalGitRepoState,
    files: VirtualFile[]
  ): GitStatusEntry[] {
    if (!repo.initialized) return [];
    const entries: GitStatusEntry[] = [];
    const currentMap = new Map<string, string>();
    for (const f of files) {
      if (f.type === 'file') {
        currentMap.set(f.path, f.content);
      }
    }

    const stagedSet = new Set(repo.stagedPaths);

    for (const [path, content] of currentMap.entries()) {
      const committed = repo.committedSnapshot[path];
      if (committed === undefined) {
        entries.push({
          path,
          status: stagedSet.has(path) ? 'added' : 'untracked',
          staged: stagedSet.has(path),
        });
      } else if (committed !== content) {
        entries.push({
          path,
          status: 'modified',
          staged: stagedSet.has(path),
        });
      }
    }

    for (const oldPath of Object.keys(repo.committedSnapshot)) {
      if (!currentMap.has(oldPath)) {
        entries.push({
          path: oldPath,
          status: 'deleted',
          staged: stagedSet.has(oldPath),
        });
      }
    }

    return entries.sort((a, b) => a.path.localeCompare(b.path));
  }

  static async stageFile(projectId: string, filePath: string, files: VirtualFile[]): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    if (!repo.stagedPaths.includes(filePath)) {
      repo.stagedPaths = [...repo.stagedPaths, filePath];
    }
    map[projectId] = repo;
    await this.saveRepoMap(map);
    return repo;
  }

  static async unstageFile(projectId: string, filePath: string, files: VirtualFile[]): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    repo.stagedPaths = repo.stagedPaths.filter((p) => p !== filePath);
    map[projectId] = repo;
    await this.saveRepoMap(map);
    return repo;
  }

  static async stageAll(projectId: string, files: VirtualFile[]): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    const status = this.computeWorkingStatus(repo, files);
    repo.stagedPaths = status.map((s) => s.path);
    map[projectId] = repo;
    await this.saveRepoMap(map);
    return repo;
  }

  static async commit(
    projectId: string,
    message: string,
    files: VirtualFile[],
    authorName = 'CodeX Developer'
  ): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    const currentMap = new Map<string, string>();
    for (const f of files) {
      if (f.type === 'file') currentMap.set(f.path, f.content);
    }

    const targets =
      repo.stagedPaths.length > 0
        ? repo.stagedPaths
        : this.computeWorkingStatus(repo, files).map((s) => s.path);

    const nextSnapshot = { ...repo.committedSnapshot };
    for (const p of targets) {
      if (currentMap.has(p)) {
        nextSnapshot[p] = currentMap.get(p)!;
      } else {
        delete nextSnapshot[p];
      }
    }

    const commitEntry: GitCommit = {
      hash: Array.from({ length: 7 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      message: message.trim() || 'Update project files',
      author: authorName,
      email: 'developer@codexstudio.local',
      timestamp: Date.now(),
      branch: repo.currentBranch,
      filesChanged: targets.length,
    };

    repo.committedSnapshot = nextSnapshot;
    repo.stagedPaths = [];
    repo.commits = [commitEntry, ...repo.commits];
    map[projectId] = repo;
    await this.saveRepoMap(map);

    // Sync with server git if running on Node backend
    fetch('/api/git/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, args: ['add', '-A'] }),
    })
      .then(() =>
        fetch('/api/git/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, args: ['commit', '-m', commitEntry.message] }),
        })
      )
      .catch(() => {});

    return repo;
  }

  static async createBranch(
    projectId: string,
    branchName: string,
    files: VirtualFile[]
  ): Promise<LocalGitRepoState> {
    const clean = branchName.trim().replace(/\s+/g, '-');
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    if (clean && !repo.branches.includes(clean)) {
      repo.branches = [...repo.branches, clean];
    }
    if (clean) {
      repo.currentBranch = clean;
    }
    map[projectId] = repo;
    await this.saveRepoMap(map);
    return repo;
  }

  static async checkoutBranch(
    projectId: string,
    branchName: string,
    files: VirtualFile[]
  ): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    if (repo.branches.includes(branchName)) {
      repo.currentBranch = branchName;
    }
    map[projectId] = repo;
    await this.saveRepoMap(map);
    return repo;
  }

  static async mergeBranch(
    projectId: string,
    sourceBranch: string,
    files: VirtualFile[]
  ): Promise<LocalGitRepoState> {
    const map = await this.loadRepoMap();
    const repo = await this.getRepoState(projectId, files);
    const mergeCommit: GitCommit = {
      hash: Array.from({ length: 7 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      message: `Merge branch '${sourceBranch}' into ${repo.currentBranch}`,
      author: 'CodeX Developer',
      email: 'developer@codexstudio.local',
      timestamp: Date.now(),
      branch: repo.currentBranch,
      filesChanged: 0,
    };
    repo.commits = [mergeCommit, ...repo.commits];
    map[projectId] = repo;
    await this.saveRepoMap(map);
    return repo;
  }

  static generateFileDiff(filePath: string, oldContent: string, newContent: string): string {
    return createPatch(filePath, oldContent, newContent, 'HEAD', 'Working Tree');
  }

  // GitHub Integration (User-provided token or public search)
  static async getSavedGitHubSession(): Promise<{ user: GitHubUser | null; token: string | null }> {
    const user = await StorageService.getItem<GitHubUser | null>(GITHUB_USER_KEY, null);
    const token = await StorageService.getItem<string | null>(GITHUB_TOKEN_KEY, null);
    return { user, token };
  }

  static async connectGitHubWithToken(token: string): Promise<{ user: GitHubUser; repos: GitHubRepo[] }> {
    const cleanToken = token.trim();
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cleanToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub authentication failed (${res.status}). Check token permissions.`);
    }
    const rawUser = (await res.json()) as {
      login: string;
      name: string | null;
      avatar_url: string;
      html_url: string;
      public_repos: number;
    };
    const user: GitHubUser = {
      login: rawUser.login,
      name: rawUser.name || rawUser.login,
      avatarUrl: rawUser.avatar_url,
      htmlUrl: rawUser.html_url,
      publicRepos: rawUser.public_repos,
      connectedAt: Date.now(),
    };

    const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=25', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cleanToken}`,
      },
    });
    const rawRepos = reposRes.ok
      ? ((await reposRes.json()) as Array<{
          id: number;
          name: string;
          full_name: string;
          description: string | null;
          private: boolean;
          html_url: string;
          clone_url: string;
          language: string | null;
          stargazers_count: number;
          default_branch: string;
          updated_at: string;
        }>)
      : [];

    const repos: GitHubRepo[] = rawRepos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      private: r.private,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      language: r.language || 'Code',
      stargazersCount: r.stargazers_count,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }));

    await StorageService.setItem(GITHUB_USER_KEY, user);
    await StorageService.setItem(GITHUB_TOKEN_KEY, cleanToken);
    return { user, repos };
  }

  static async disconnectGitHub(): Promise<void> {
    await StorageService.removeItem(GITHUB_USER_KEY);
    await StorageService.removeItem(GITHUB_TOKEN_KEY);
  }

  static async searchPublicRepositories(query: string, token?: string | null): Promise<GitHubRepo[]> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/github/search?q=${encodeURIComponent(query || 'android kotlin')}`, {
      headers,
    });
    if (!res.ok) {
      throw new Error('Unable to fetch GitHub repositories');
    }
    const data = (await res.json()) as { ok: boolean; repos?: GitHubRepo[]; error?: string };
    if (!data.ok) throw new Error(data.error || 'GitHub query error');
    return data.repos || [];
  }

  static async fetchGitHubRepoFiles(
    fullName: string,
    branch = 'main',
    token?: string | null
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const treeRes = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) {
      throw new Error(`Could not load repository tree (${treeRes.status})`);
    }
    const treeData = (await treeRes.json()) as {
      tree?: Array<{ path: string; type: 'blob' | 'tree'; size?: number }>;
    };

    const blobs = (treeData.tree || [])
      .filter(
        (item) =>
          item.type === 'blob' &&
          (item.size || 0) < 120_000 &&
          !/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|zip|jar|apk|so|lock)$/i.test(item.path)
      )
      .slice(0, 24);

    const files: Record<string, string> = {};
    await Promise.all(
      blobs.map(async (blob) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${fullName}/${encodeURIComponent(branch)}/${blob.path}`;
          const r = await fetch(rawUrl);
          if (r.ok) {
            files[blob.path] = await r.text();
          }
        } catch {
          // Skip individual file fetch errors
        }
      })
    );

    if (Object.keys(files).length === 0) {
      files['README.md'] = `# ${fullName}\n\nCloned from GitHub (${branch}).\n`;
    }
    return files;
  }
}
