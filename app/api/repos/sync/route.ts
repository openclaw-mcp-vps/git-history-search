import { NextRequest, NextResponse } from "next/server";
import { fetchRepositoryDocuments } from "@/lib/github";
import { hasPaywallCookie } from "@/lib/paywall";
import { listIndexedReposForUser, upsertIndexedRepoForUser } from "@/lib/repositories";
import { getSessionFromCookies } from "@/lib/session";
import { indexRepositoryDocuments } from "@/lib/vector-db";

export async function GET(): Promise<NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const paid = await hasPaywallCookie();
  if (!paid) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const repos = await listIndexedReposForUser(session.user.login);
  return NextResponse.json({ repos });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const paid = await hasPaywallCookie();
  if (!paid) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const payload = (await request.json()) as { repository?: string };
  const repository = payload.repository?.trim();

  if (!repository) {
    return NextResponse.json({ error: "repository is required" }, { status: 400 });
  }

  try {
    const docs = await fetchRepositoryDocuments(session.accessToken, repository);
    const indexResult = await indexRepositoryDocuments(repository, docs);

    await upsertIndexedRepoForUser(session.user.login, {
      fullName: repository,
      indexedCount: indexResult.indexedCount,
      syncedAt: new Date().toISOString()
    });

    return NextResponse.json({
      repository,
      indexedCount: indexResult.indexedCount,
      fetchedCount: docs.length,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Repository sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync repository. Ensure the token has access and repository exists." },
      { status: 500 }
    );
  }
}
