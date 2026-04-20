"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface IndexedRepo {
  fullName: string;
  indexedCount: number;
  syncedAt: string;
}

interface SearchMatch {
  id: string;
  type: string;
  title: string;
  url: string;
  score: number;
  excerpt: string;
  createdAt: string;
}

interface SearchInterfaceProps {
  repos: IndexedRepo[];
}

export function SearchInterface({ repos }: SearchInterfaceProps) {
  const [selectedRepo, setSelectedRepo] = useState(repos[0]?.fullName || "");
  const [query, setQuery] = useState(
    "Which commits and PRs introduced or fixed auth rate limiting behavior?"
  );
  const [answer, setAnswer] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const queryExamples = useMemo(
    () => [
      "Which PRs fixed auth bugs in the last 6 months?",
      "When did we add rate limiting to login endpoints?",
      "Show commits that changed token refresh logic."
    ],
    []
  );

  async function runSearch() {
    if (!selectedRepo || !query.trim()) {
      setError("Choose an indexed repo and enter a question.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repository: selectedRepo, query })
      });

      const payload = (await response.json()) as {
        error?: string;
        answer?: string;
        matches?: SearchMatch[];
      };

      if (!response.ok) {
        setError(payload.error || "Search failed.");
        return;
      }

      setAnswer(payload.answer || "No answer generated.");
      setMatches(payload.matches || []);
    } catch {
      setError("Search request failed. Verify connectivity and retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ask Your Git History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="repo" className="text-sm text-slate-400">
              Indexed repository
            </label>
            <select
              id="repo"
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
              value={selectedRepo}
              onChange={(event) => setSelectedRepo(event.target.value)}
            >
              {repos.map((repo) => (
                <option value={repo.fullName} key={repo.fullName}>
                  {repo.fullName} ({repo.indexedCount} docs)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="query" className="text-sm text-slate-400">
              Natural-language query
            </label>
            <Textarea
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-[120px]"
            />
            <div className="flex flex-wrap gap-2">
              {queryExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={runSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching indexed history...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search History
              </>
            )}
          </Button>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </CardContent>
      </Card>

      {answer ? (
        <Card>
          <CardHeader>
            <CardTitle>AI Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{answer}</p>
          </CardContent>
        </Card>
      ) : null}

      {matches.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cited Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {matches.map((match) => (
                <li key={match.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{match.type}</Badge>
                      <span className="text-xs text-slate-500">score {match.score}</span>
                    </div>
                    <a
                      className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                      href={match.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="mb-1 text-sm font-semibold text-slate-100">{match.title}</p>
                  <p className="text-xs text-slate-400">{new Date(match.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-sm text-slate-300">{match.excerpt}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
