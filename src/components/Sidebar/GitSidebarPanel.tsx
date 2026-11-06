import React, { useMemo, useState } from 'react';
import {
  Check,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { useIDEStore } from '../../store/useIDEStore';
import { useIDETheme } from '../../context/ThemeContext';
import { GitService } from '../../services/GitService';
import { formatRelativeTime } from '../../utils/languageUtils';

export const GitSidebarPanel: React.FC = () => {
  const theme = useIDETheme();
  const activeProjectId = useIDEStore((s) => s.activeProjectId);
  const files = useIDEStore((s) => s.files);
  const gitRepos = useIDEStore((s) => s.gitRepos);
  const initGitRepo = useIDEStore((s) => s.initGitRepo);
  const stageGitFile = useIDEStore((s) => s.stageGitFile);
  const unstageGitFile = useIDEStore((s) => s.unstageGitFile);
  const stageAllGitFiles = useIDEStore((s) => s.stageAllGitFiles);
  const commitGitChanges = useIDEStore((s) => s.commitGitChanges);
  const createGitBranch = useIDEStore((s) => s.createGitBranch);
  const checkoutGitBranch = useIDEStore((s) => s.checkoutGitBranch);
  const mergeGitBranch = useIDEStore((s) => s.mergeGitBranch);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);

  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [diffPreview, setDiffPreview] = useState<{ path: string; patch: string } | null>(null);

  const projFiles = useMemo(
    () => files.filter((f) => f.projectId === activeProjectId),
    [files, activeProjectId]
  );

  const repo = activeProjectId ? gitRepos[activeProjectId] : undefined;

  const statusList = useMemo(() => {
    if (!repo) return [];
    return GitService.computeWorkingStatus(repo, projFiles);
  }, [repo, projFiles]);

  if (!activeProjectId) {
    return (
      <div className="p-4 text-xs" style={{ color: theme.ui.textSecondary }}>
        Open a project to inspect Git source control.
      </div>
    );
  }

  if (!repo || !repo.initialized) {
    return (
      <div className="p-4 space-y-3 text-xs">
        <p style={{ color: theme.ui.textSecondary }}>
          This workspace does not have an active Git repository yet.
        </p>
        <button
          type="button"
          onClick={() => initGitRepo(activeProjectId)}
          className="w-full h-9 rounded-lg font-semibold"
          style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
        >
          Initialize Git Repository
        </button>
      </div>
    );
  }

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    await commitGitChanges(activeProjectId, commitMessage.trim());
    setCommitMessage('');
  };

  const inspectFileDiff = (filePath: string) => {
    const oldText = repo.committedSnapshot[filePath] ?? '';
    const newText = projFiles.find((f) => f.path === filePath)?.content ?? '';
    const patch = GitService.generateFileDiff(filePath, oldText, newText);
    setDiffPreview({ path: filePath, patch });
  };

  return (
    <div className="flex flex-col h-full text-xs select-none overflow-hidden">
      {/* Header & Branch Bar */}
      <div className="p-3 border-b space-y-2.5 shrink-0" style={{ borderColor: theme.ui.border }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Source Control</span>
          <button
            type="button"
            onClick={() => setActiveRoute('github')}
            className="text-[11px] font-medium hover:underline"
            style={{ color: theme.ui.accent }}
          >
            GitHub Remote
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: theme.ui.accent }} />
          <select
            aria-label="Current Git Branch"
            value={repo.currentBranch}
            onChange={(e) => checkoutGitBranch(activeProjectId, e.target.value)}
            className="flex-1 h-8 px-2 rounded-lg border text-xs font-mono-code focus:outline-none"
            style={{
              backgroundColor: theme.ui.bgPrimary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          >
            {repo.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <button
            type="button"
            title="New Branch"
            onClick={() => setShowBranchInput(!showBranchInput)}
            className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-slate-500/10 shrink-0"
            style={{ borderColor: theme.ui.border }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {repo.branches.length > 1 && (
            <button
              type="button"
              title="Merge another branch into current"
              onClick={() => {
                const other = repo.branches.find((b) => b !== repo.currentBranch);
                if (other) mergeGitBranch(activeProjectId, other);
              }}
              className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-slate-500/10 shrink-0"
              style={{ borderColor: theme.ui.border }}
            >
              <GitMerge className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {showBranchInput && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newBranchName.trim()) return;
              await createGitBranch(activeProjectId, newBranchName.trim());
              setNewBranchName('');
              setShowBranchInput(false);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/new-branch"
              className="flex-1 h-8 px-2.5 rounded-lg border text-xs font-mono-code focus:outline-none"
              style={{
                backgroundColor: theme.ui.bgPrimary,
                borderColor: theme.ui.border,
                color: theme.ui.textPrimary,
              }}
            />
            <button
              type="submit"
              className="h-8 px-2.5 rounded-lg font-semibold"
              style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
            >
              Create
            </button>
          </form>
        )}

        {/* Commit Box */}
        <form onSubmit={handleCommit} className="space-y-1.5">
          <textarea
            rows={2}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="w-full p-2 rounded-lg border text-xs resize-none focus:outline-none"
            style={{
              backgroundColor: theme.ui.bgPrimary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
          />
          <button
            type="submit"
            disabled={!commitMessage.trim() || statusList.length === 0}
            className="w-full h-8 rounded-lg font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
            style={{ backgroundColor: theme.ui.accent, color: theme.ui.accentText }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Commit Changes ({statusList.length})</span>
          </button>
        </form>
      </div>

      {/* Working Tree Changes & Commit History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold">Changes ({statusList.length})</span>
            {statusList.length > 0 && (
              <button
                type="button"
                onClick={() => stageAllGitFiles(activeProjectId)}
                className="text-[11px] hover:underline"
                style={{ color: theme.ui.accent }}
              >
                Stage All
              </button>
            )}
          </div>

          {statusList.length === 0 ? (
            <p className="py-2" style={{ color: theme.ui.textSecondary }}>
              Working tree clean.
            </p>
          ) : (
            <div className="space-y-1">
              {statusList.map((entry) => (
                <div
                  key={entry.path}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border"
                  style={{
                    backgroundColor: theme.ui.bgPrimary,
                    borderColor: theme.ui.border,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => inspectFileDiff(entry.path)}
                    className="flex-1 text-left truncate font-mono-code text-[11px] hover:underline"
                    title="Inspect Diff"
                  >
                    {entry.path}
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono-code text-[11px] uppercase opacity-75">
                      {entry.status[0]}
                    </span>
                    {entry.staged ? (
                      <button
                        type="button"
                        title="Unstage"
                        onClick={() => unstageGitFile(activeProjectId, entry.path)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-500/15"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Stage"
                        onClick={() => stageGitFile(activeProjectId, entry.path)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-500/15"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commit History */}
        <div className="border-t pt-3" style={{ borderColor: theme.ui.border }}>
          <div className="font-semibold mb-2">Commit History ({repo.commits.length})</div>
          <div className="space-y-2">
            {repo.commits.slice(0, 15).map((c) => (
              <div
                key={c.hash}
                className="p-2 rounded-lg border space-y-1"
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
                  className="flex items-center justify-between text-[11px] font-mono-code"
                  style={{ color: theme.ui.textSecondary }}
                >
                  <span>{c.hash} · {c.branch}</span>
                  <span>{formatRelativeTime(c.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Diff Modal */}
      {diffPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDiffPreview(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
            style={{
              backgroundColor: theme.ui.bgSecondary,
              borderColor: theme.ui.border,
              color: theme.ui.textPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: theme.ui.border }}
            >
              <span className="text-xs font-mono-code font-semibold">
                Git Diff: {diffPreview.path}
              </span>
              <button
                type="button"
                onClick={() => setDiffPreview(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre
              className="flex-1 overflow-auto p-4 text-xs font-mono-code leading-relaxed whitespace-pre"
              style={{ backgroundColor: theme.editor.background }}
            >
              {diffPreview.patch || 'No textual changes detected.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
