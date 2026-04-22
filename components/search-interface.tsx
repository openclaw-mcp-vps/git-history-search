"use client";

import { FormEvent, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { SearchResultHit, SearchResults } from "@/components/search-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SearchResponse {
  ok: boolean;
  summary?: string;
  query?: string;
  hits?: SearchResultHit[];
  error?: string;
}

interface SearchInterfaceProps {
  repoFullName: string;
}

const sampleQueries = [
  "which pull requests fixed auth bugs",
  "when did we add rate limiting",
  "show me commits that changed JWT validation",
  "issues related to session expiration incidents",
];

export function SearchInterface({ repoFullName }: SearchInterfaceProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [hits, setHits] = useState<SearchResultHit[]>([]);

  const canSearch = repoFullName.length > 0 && query.trim().length > 0 && !loading;

  async function runSearch(nextQuery: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoFullName,
          query: nextQuery,
        }),
      });

      const json = (await response.json()) as SearchResponse;

      if (!response.ok || !json.ok) {
        setError(json.error ?? "Search failed.");
        setSummary("");
        setHits([]);
        return;
      }

      setSummary(json.summary ?? "");
      setHits(json.hits ?? []);
    } catch {
      setError("Search request failed. Check your network and try again.");
      setSummary("");
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      return;
    }
    await runSearch(normalized);
  }

  if (!repoFullName) {
    return (
      <Card className="border border-white/10 bg-[#111827]/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">Choose and sync a repository first</CardTitle>
          <CardDescription>
            Once a repo is synced, ask natural language questions about its commit and PR history.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-white/10 bg-[#111827]/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">Ask about repository history</CardTitle>
          <CardDescription>
            Repository: <span className="font-medium text-zinc-200">{repoFullName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: when did we introduce auth middleware retries?"
              className="h-10 bg-[#0b1220] text-zinc-100"
            />
            <Button type="submit" className="h-10 gap-1 bg-cyan-600 text-white hover:bg-cyan-500" disabled={!canSearch}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  void runSearch(sample);
                }}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20"
              >
                {sample}
              </button>
            ))}
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border border-white/10 bg-[#111827]/80">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ranking commits, pull requests, and issues...
          </CardContent>
        </Card>
      ) : null}

      <SearchResults query={query} summary={summary} hits={hits} />
    </div>
  );
}
