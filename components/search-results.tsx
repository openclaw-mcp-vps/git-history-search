"use client";

import { ExternalLink, GitCommitHorizontal, GitPullRequest, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface SearchResultHit {
  id: string;
  sourceType: "commit" | "pull_request" | "issue";
  title: string;
  url: string;
  excerpt: string;
  authoredAt: string;
  score: number;
  keywordMatches: number;
}

interface SearchResultsProps {
  query: string;
  summary: string;
  hits: SearchResultHit[];
}

function getSourceIcon(sourceType: SearchResultHit["sourceType"]) {
  if (sourceType === "commit") {
    return GitCommitHorizontal;
  }
  if (sourceType === "pull_request") {
    return GitPullRequest;
  }
  return MessageSquare;
}

function getSourceLabel(sourceType: SearchResultHit["sourceType"]): string {
  if (sourceType === "pull_request") {
    return "Pull Request";
  }
  if (sourceType === "commit") {
    return "Commit";
  }
  return "Issue";
}

export function SearchResults({ query, summary, hits }: SearchResultsProps) {
  if (hits.length === 0) {
    return (
      <Card className="border border-white/10 bg-[#111827]/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">No indexed matches yet</CardTitle>
          <CardDescription>
            Sync the repository first, then ask things like “when did we add rate limiting?”
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-sky-500/5">
        <CardHeader>
          <CardTitle className="text-zinc-100">Answer</CardTitle>
          <CardDescription className="text-zinc-300">Query: {query}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-zinc-200">{summary}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {hits.map((hit) => {
          const Icon = getSourceIcon(hit.sourceType);
          return (
            <Card key={hit.id} className="border border-white/10 bg-[#111827]/80">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cyan-300" />
                    <CardTitle className="text-sm text-zinc-100">{hit.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getSourceLabel(hit.sourceType)}</Badge>
                    <Badge variant="secondary">Score {hit.score.toFixed(3)}</Badge>
                  </div>
                </div>
                <CardDescription>
                  {new Date(hit.authoredAt).toLocaleString()} • Keyword overlap {hit.keywordMatches}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-zinc-300">{hit.excerpt}</p>
                <Separator className="bg-white/10" />
                <a
                  href={hit.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Open source on GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
