import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { listRepoSyncRecords, upsertRepoSyncRecord } from "@/lib/db";
import {
  fetchRepoHistorySnapshot,
  GITHUB_TOKEN_COOKIE,
  listGitHubRepos,
} from "@/lib/github";
import { hasPaidAccess } from "@/lib/lemonsqueezy";
import { embedTexts } from "@/lib/openai";
import { replaceRepositoryDocuments } from "@/lib/vector-db";

export const runtime = "nodejs";

const syncSchema = z.object({
  repoFullName: z.string().trim().min(3),
});

function unauthorizedResponse(message: string, status = 401): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!hasPaidAccess(request)) {
    return unauthorizedResponse("This endpoint is behind the paid dashboard.", 402);
  }

  const token = request.cookies.get(GITHUB_TOKEN_COOKIE)?.value;
  if (!token) {
    return unauthorizedResponse("Connect GitHub before listing repositories.");
  }

  try {
    const [repos, syncRecords] = await Promise.all([
      listGitHubRepos(token),
      listRepoSyncRecords(),
    ]);

    return NextResponse.json({
      ok: true,
      repos: repos.map((repo) => ({
        ...repo,
        sync: syncRecords[repo.fullName] ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load repositories.";
    return unauthorizedResponse(message, 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!hasPaidAccess(request)) {
    return unauthorizedResponse("This endpoint is behind the paid dashboard.", 402);
  }

  const token = request.cookies.get(GITHUB_TOKEN_COOKIE)?.value;
  if (!token) {
    return unauthorizedResponse("Connect GitHub before syncing a repository.");
  }

  const json = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(json);
  if (!parsed.success) {
    return unauthorizedResponse("Invalid payload. Expected { repoFullName }.", 400);
  }

  try {
    const repoFullName = parsed.data.repoFullName;
    const snapshot = await fetchRepoHistorySnapshot(token, repoFullName);

    const embeddingInputs = snapshot.artifacts.map((artifact) => {
      return `${artifact.title}\n\n${artifact.body}`;
    });

    const embeddings = await embedTexts(embeddingInputs);

    const indexedDocuments = snapshot.artifacts.map((artifact, index) => ({
      id: artifact.id,
      repoFullName,
      sourceType: artifact.sourceType,
      sourceId: artifact.sourceId,
      title: artifact.title,
      body: artifact.body,
      url: artifact.url,
      authoredAt: artifact.authoredAt,
      embedding: embeddings[index] ?? [],
    }));

    await replaceRepositoryDocuments(repoFullName, indexedDocuments);

    const syncRecord = {
      repoFullName,
      syncedAt: new Date().toISOString(),
      commits: snapshot.commits,
      pullRequests: snapshot.pullRequests,
      issues: snapshot.issues,
      documents: indexedDocuments.length,
      defaultBranch: snapshot.defaultBranch,
    };

    await upsertRepoSyncRecord(syncRecord);

    return NextResponse.json({
      ok: true,
      sync: syncRecord,
      indexedDocuments: indexedDocuments.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed unexpectedly.";
    return unauthorizedResponse(message, 500);
  }
}
