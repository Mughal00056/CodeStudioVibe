import React, { useState } from 'react';
import {
  Check,
  DownloadCloud,
  GitBranch,
  GitCommitHorizontal,
  KeyRound,
  LogOut,
  Search,
  Star,
} from 'lucide-react';
import type { GitHubRepo } from '../../types';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { GitService } from '../../services/GitService';
import { formatRelativeTime } from '../../utils/languageUtils';

export const GitHubPage: React.FC = () => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const projects = useIDEStore((s) => s.projects);
  const files = useIDEStore((s) => s.files);
  const gitRepos = useIDEStore((s) => s.gitRepos);
  const githubUser = useIDEStore((s) => s.githubUser);
  const githubToken = useIDEStore((s) => s.githubToken);
  const githubRepos = useIDEStore((s) => s.githubRepos);

  const connectGitHub = useIDEStore((s) => s.connectGitHub);
  const disconnectGitHub = useIDEStore((s) => s.disconnectGitHub);
  const cloneGitHubRepository = useIDEStore((s) => s.cloneGitHubRepository);
  const commitGitChanges = useIDEStore((s) => s.commitGitChanges);
  const createGitBranch = useIDEStore((s) => s.createGitBranch);
  const checkoutGitBranch = useIDEStore((s) => s.checkoutGitBranch);
  const pushToast = useIDEStore((s) => s.pushToast);

  const [tokenInput, setTokenInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('kotlin android');
  const [searchResults, setSearchResults] = useState<GitHubRepo[]>([]);
  const [searching, setSearching] = useState(false);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [branchName, setBranchName] = useState('');

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const activeGit = activeProjectId ? gitRepos[activeProjectId] : undefined;
  const activeFiles = files.filter((f) => f.projectId === activeProjectId);
  const workingChanges = activeGit ? GitService.computeWorkingStatus(activeGit, activeFiles) : [];

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setAuthLoading(true);
    try {
      await connectGitHub(tokenInput.trim());
      setTokenInput('');
    } catch (err) {
      pushToast(
        'error',
        'GitHub Authentication Failed',
        err instanceof Error ? err.message : 'Invalid token'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSearchRepos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const repos = await GitService.searchPublicRepositories(searchQuery, githubToken);
      setSearchResults(repos);
    } catch (err) {
      pushToast(
        'warning',
        'GitHub Search Unavailable',
        err instanceof Error ? err.message : 'Check network connectivity'
      );
    } finally {
      setSearching(false);
    }
  };

  const displayedRepos = searchResults.length > 0 ? searchResults : githubRepos;

  return (
    <div
      className="h-full w-full overflow-y-auto px-4 sm:px-6 lg:px-10 py-6"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Git &amp; GitHub Integration</h1>
          <p className="text-xs mt-0.5" style={{ color: theme.ui.textSecondary }}>
            Connect your GitHub account with a personal access token, search and clone repositories, or manage local branches and commits.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: GitHub Account & Public Search */}
          <div className="lg:col-span-7 space-y-5">
            {/* GitHub Account Card */}
            <section
              className="rounded-2xl border p-5 space-y-4"
              style={{
                backgroundColor: theme.ui.bgSecondary,
                borderColor: theme.ui.border,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" style={{ color: theme.ui.accent }} />
                  <h2 className="text-sm font-semibold">GitHub Account Session</h2>
                </div>
                {githubUser && (
                  <button
                    type="button"
                    onClick={disconnectGitHub}
                    className="h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:bg-slate-500/10"
                    style={{ borderColor: theme.ui.border }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              {githubUser ? (
                <div className="flex items-center gap-3">
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover border"
                    style={{ borderColor: theme.ui.border }}
                  />
                  <div>
                    <div className="text-sm font-semibold">{githubUser.name}</div>
                    <div className="text-xs font-mono-code" style={{ color: theme.ui.textSecondary }}>
                      @{githubUser.login} · {githubUser.publicRepos} public repos
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnect} className="space-y-2.5">
                  <p className="text-xs" style={{ color: theme.ui.textSecondary }}>
                    Tokens are stored locally in IndexedDB on your device and never hardcoded or transmitted to third parties.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_... (GitHub Personal Access Token)"
                      className="flex-1 h-10 px-3 rounded-xl border text-xs font-mono-code focus:outline-none"
                      style={{
                        backgroundColor: theme.ui.bgPrimary,
                        borderColor: theme.ui.border,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={authLoading || !tokenInput.trim()}
                      className="h-10 px-4 rounded-xl text-xs font-semibold disabled:opacity-45 whitespace-nowrap"
                      style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                    >
                      {authLoading ? 'Verifying...' : 'Connect GitHub'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Search & Clone Repositories */}
            <section
              className="rounded-2xl border p-5 space-y-4"
              style={{
                backgroundColor: theme.ui.bgSecondary,
                borderColor: theme.ui.border,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Search &amp; Clone Repositories</h2>
              </div>

              <form onSubmit={handleSearchRepos} className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: theme.ui.textSecondary }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search GitHub repositories..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border text-xs focus:outline-none"
                    style={{
                      backgroundColor: theme.ui.bgPrimary,
                      borderColor: theme.ui.border,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="h-10 px-4 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {displayedRepos.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: theme.ui.textSecondary }}>
                  Run a search above or connect your GitHub account to browse repositories and clone them into CodeX Studio.
                </p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden" style={{ borderColor: theme.ui.border }}>
                  {displayedRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-3.5 flex items-center justify-between gap-3"
                      style={{
                        backgroundColor: theme.ui.bgPrimary,
                        borderColor: theme.ui.border,
                      }}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-semibold truncate">{repo.fullName}</div>
                        {repo.description && (
                          <p className="text-[11px] truncate" style={{ color: theme.ui.textSecondary }}>
                            {repo.description}
                          </p>
                        )}
                        <div
                          className="text-[11px] flex items-center gap-2 tabular-nums"
                          style={{ color: theme.ui.textSecondary }}
                        >
                          <span>{repo.language}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {repo.stargazersCount}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{repo.defaultBranch}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={cloningId === repo.id}
                        onClick={async () => {
                          setCloningId(repo.id);
                          try {
                            await cloneGitHubRepository(repo);
                          } catch (err) {
                            pushToast(
                              'error',
                              'Clone failed',
                              err instanceof Error ? err.message : 'Unable to fetch repo files'
                            );
                          } finally {
                            setCloningId(null);
                          }
                        }}
                        className="h-9 px-3.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-500/10 shrink-0"
                        style={{ borderColor: theme.ui.border }}
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        <span>{cloningId === repo.id ? 'Cloning...' : 'Clone'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Active Project Git Status, Branches & Commit History */}
          <div className="lg:col-span-5 space-y-5">
            <section
              className="rounded-2xl border p-5 space-y-4"
              style={{
                backgroundColor: theme.ui.bgSecondary,
                borderColor: theme.ui.border,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Local Repository: {activeProject?.name || 'None'}
                </h2>
                {activeGit && (
                  <span className="font-mono-code text-xs" style={{ color: theme.ui.accent }}>
                    {activeGit.currentBranch}
                  </span>
                )}
              </div>

              {activeProject && activeGit ? (
                <>
                  {/* Branch Switcher & Creator */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium">Branch Management</label>
                    <div className="flex gap-2">
                      <select
                        value={activeGit.currentBranch}
                        onChange={(e) => checkoutGitBranch(activeProject.id, e.target.value)}
                        className="flex-1 h-9 px-2.5 rounded-lg border text-xs font-mono-code focus:outline-none"
                        style={{
                          backgroundColor: theme.ui.bgPrimary,
                          borderColor: theme.ui.border,
                        }}
                      >
                        {activeGit.branches.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!branchName.trim()) return;
                        await createGitBranch(activeProject.id, branchName.trim());
                        setBranchName('');
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="New branch name..."
                        className="flex-1 h-9 px-2.5 rounded-lg border text-xs font-mono-code focus:outline-none"
                        style={{
                          backgroundColor: theme.ui.bgPrimary,
                          borderColor: theme.ui.border,
                        }}
                      />
                      <button
                        type="submit"
                        className="h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1 hover:bg-slate-500/10"
                        style={{ borderColor: theme.ui.border }}
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Branch</span>
                      </button>
                    </form>
                  </div>

                  {/* Commit Form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!commitMsg.trim()) return;
                      await commitGitChanges(activeProject.id, commitMsg.trim());
                      setCommitMsg('');
                    }}
                    className="space-y-2 pt-2 border-t"
                    style={{ borderColor: theme.ui.border }}
                  >
                    <div className="text-xs font-medium">
                      Working Changes ({workingChanges.length})
                    </div>
                    <input
                      type="text"
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      placeholder="Commit message..."
                      className="w-full h-9 px-3 rounded-lg border text-xs focus:outline-none"
                      style={{
                        backgroundColor: theme.ui.bgPrimary,
                        borderColor: theme.ui.border,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!commitMsg.trim() || workingChanges.length === 0}
                      className="w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                      style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Commit ({workingChanges.length} modified)</span>
                    </button>
                  </form>

                  {/* Commit Log */}
                  <div className="space-y-2 pt-2 border-t" style={{ borderColor: theme.ui.border }}>
                    <div className="text-xs font-medium">Recent Commits</div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {activeGit.commits.map((c) => (
                        <div
                          key={c.hash}
                          className="p-2.5 rounded-lg border text-xs space-y-1"
                          style={{
                            backgroundColor: theme.ui.bgPrimary,
                            borderColor: theme.ui.border,
                          }}
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            <GitCommitHorizontal className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
                            <span className="truncate">{c.message}</span>
                          </div>
                          <div
                            className="text-[11px] font-mono-code flex justify-between"
                            style={{ color: theme.ui.textSecondary }}
                          >
                            <span>{c.hash} · {c.branch}</span>
                            <span>{formatRelativeTime(c.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs" style={{ color: theme.ui.textSecondary }}>
                  Select or create a project to manage Git branches and commits.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
