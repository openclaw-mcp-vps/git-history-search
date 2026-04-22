import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasPaidAccess } from "@/lib/lemonsqueezy";
import { embedQuery, summarizeSearchResults } from "@/lib/openai";
import { searchRepositoryDocuments } from "@/lib/vector-db";

export const runtime = "nodejs";

const searchSchema = z.object({
  repoFullName: z.string().trim().min(3),
  query: z.string().trim().min(3),
  limit: z.number().int().min(1).max(20).optional(),
});

function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasPaidAccess(request)) {
    return jsonError("Search is behind the paid dashboard.", 402);
  }

  const body = await request.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid payload. Expected { repoFullName, query }.", 400);
  }

  const { repoFullName, query, limit = 8 } = parsed.data;

  try {
    const queryEmbedding = await embedQuery(query);
    const hits = await searchRepositoryDocuments(repoFullName, query, queryEmbedding, limit);

    const summary = await summarizeSearchResults(
      query,
      hits.map((hit) => ({
        title: hit.title,
        sourceType: hit.sourceType,
        excerpt: hit.excerpt,
        url: hit.url,
      })),
    );

    return NextResponse.json({
      ok: true,
      summary,
      query,
      repoFullName,
      count: hits.length,
      hits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed unexpectedly.";
    return jsonError(message, 500);
  }
}
