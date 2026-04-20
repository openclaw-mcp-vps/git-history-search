"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Clock4, GitBranch, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface GitHubRepo {
  id: number;
  fullName: string;
  private: boolean;
  updatedAt: string;
}

interface IndexedRepo {
  fullName: string;
  indexedCount: number;
  syncedAt: string;
}

interface RepoSelectorProps {
  repos: GitHubRepo[];
  indexedRepos: IndexedRepo[];
}

export function RepoSelector({ repos, indexedRepos }: RepoSelectorProps) {
  const [selected, setSelected] = useState<string>(repos[0]?.fullName || "");
  const [filter, setFilter] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const visibleRepos = useMemo(() => {
    const lower = filter.toLowerCase().trim();
    if (!lower) {
      return repos;
    }

    return repos.filter((repo) => repo.fullName.toLowerCase().includes(lower));
  }, [filter, repos]);

  async function syncSelectedRepo() {
    if (!selected) {
      setError("Pick a repository first.");
      return;
    }

    setSyncing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/repos/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repository: selected })
      });

      const payload = (await response.json()) as {
        error?: string;
        repository?: string;
        indexedCount?: number;
      };

      if (!response.ok) {
        setError(payload.error || "Sync failed.");
        return;
      }

      setMessage(
        `Indexed ${payload.indexedCount || 0} history items for ${payload.repository}. Refreshing dashboard...`
      );

      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch {
      setError("Sync request failed. Verify connectivity and retry.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connect and Index a Repository</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="repo-filter" className="text-sm text-slate-400">
              Filter repos
            </label>
            <Input
              id="repo-filter"
              placeholder="owner/service-api"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="repo-select" className="text-sm text-slate-400">
              Repository
            </label>
            <select
              id="repo-select"
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {visibleRepos.length === 0 ? <option value="">No matching repositories</option> : null}
              {visibleRepos.map((repo) => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={syncSelectedRepo} disabled={syncing || !selected}>
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing commit diffs, PRs, and issues...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync Repository History
              </>
            )}
          </Button>

          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {error ? (
            <p className="flex items-center gap-2 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Indexed Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          {indexedRepos.length === 0 ? (
            <p className="text-sm text-slate-400">No repositories indexed yet.</p>
          ) : (
            <ul className="space-y-3">
              {indexedRepos.map((repo) => (
                <li
                  key={repo.fullName}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <GitBranch className="h-4 w-4 text-sky-400" />
                      {repo.fullName}
                    </div>
                    <Badge variant="neutral">{repo.indexedCount} docs</Badge>
                  </div>
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock4 className="h-3.5 w-3.5" />
                    Last sync: {new Date(repo.syncedAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
