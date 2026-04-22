"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Github, Loader2, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RepoSyncMeta {
  syncedAt: string;
  documents: number;
}

interface RepoItem {
  id: number;
  fullName: string;
  description: string | null;
  private: boolean;
  updatedAt: string;
  sync: RepoSyncMeta | null;
}

interface RepoListResponse {
  ok: boolean;
  repos?: RepoItem[];
  error?: string;
}

interface SyncResponse {
  ok: boolean;
  error?: string;
  indexedDocuments?: number;
}

interface RepoConnectorProps {
  hasGitHubConnection: boolean;
  selectedRepo: string;
}

export function RepoConnector({ hasGitHubConnection, selectedRepo }: RepoConnectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(selectedRepo);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelected(selectedRepo);
  }, [selectedRepo]);

  async function loadRepos() {
    if (!hasGitHubConnection) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/repos/sync", { cache: "no-store" });
      const json = (await response.json()) as RepoListResponse;

      if (!response.ok || !json.ok) {
        setError(json.error ?? "Could not load repositories.");
        setRepos([]);
        return;
      }

      setRepos(json.repos ?? []);
    } catch {
      setError("Repository fetch failed.");
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGitHubConnection]);

  function updateRepoInUrl(nextRepo: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextRepo) {
      nextParams.set("repo", nextRepo);
    } else {
      nextParams.delete("repo");
    }

    const queryString = nextParams.toString();
    router.replace(queryString ? `/dashboard?${queryString}` : "/dashboard");
  }

  async function syncSelectedRepo() {
    if (!selected) {
      return;
    }

    setSyncing(true);
    setError(null);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/repos/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoFullName: selected }),
      });

      const json = (await response.json()) as SyncResponse;
      if (!response.ok || !json.ok) {
        setError(json.error ?? "Repository sync failed.");
        return;
      }

      setSyncMessage(`Indexed ${json.indexedDocuments ?? 0} documents from ${selected}.`);
      await loadRepos();
      updateRepoInUrl(selected);
    } catch {
      setError("Repository sync request failed.");
    } finally {
      setSyncing(false);
    }
  }

  const selectedRepoInfo = useMemo(
    () => repos.find((repo) => repo.fullName === selected) ?? null,
    [repos, selected],
  );

  return (
    <Card className="border border-white/10 bg-[#111827]/80">
      <CardHeader>
        <CardTitle className="text-zinc-100">Connect and sync repository</CardTitle>
        <CardDescription>
          Pull commits, PRs, and issues into semantic index so natural-language search works.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasGitHubConnection ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-600/20 text-emerald-200">GitHub connected</Badge>
            <Button
              type="button"
              variant="outline"
              className="h-8 border-white/20 bg-transparent text-zinc-200 hover:bg-white/5"
              onClick={() => void loadRepos()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
            <a
              href="/api/auth/github?disconnect=1"
              className="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
            >
              Disconnect
            </a>
          </div>
        ) : (
          <a
            href="/api/auth/github"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-semibold text-zinc-900 transition hover:bg-white"
          >
            <Github className="h-4 w-4" />
            Connect GitHub
          </a>
        )}

        {hasGitHubConnection ? (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={selected}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelected(value);
                  updateRepoInUrl(value);
                }}
                className="h-10 rounded-lg border border-white/15 bg-[#0b1220] px-3 text-sm text-zinc-100 outline-none ring-cyan-500/30 focus:ring"
              >
                <option value="">Select a repository...</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.fullName}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={() => void syncSelectedRepo()}
                disabled={!selected || syncing}
                className="h-10 bg-cyan-600 text-white hover:bg-cyan-500"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sync index
              </Button>
            </div>

            {selectedRepoInfo ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
                <p className="font-medium text-zinc-100">{selectedRepoInfo.fullName}</p>
                {selectedRepoInfo.description ? <p className="mt-1">{selectedRepoInfo.description}</p> : null}
                <p className="mt-2">
                  Updated {new Date(selectedRepoInfo.updatedAt).toLocaleString()}
                  {selectedRepoInfo.sync
                    ? ` • Last indexed ${new Date(selectedRepoInfo.sync.syncedAt).toLocaleString()} (${selectedRepoInfo.sync.documents} docs)`
                    : " • Not indexed yet"}
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {syncMessage ? <p className="text-sm text-emerald-300">{syncMessage}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
