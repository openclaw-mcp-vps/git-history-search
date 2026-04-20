import { NextRequest, NextResponse } from "next/server";
import { answerWithContext } from "@/lib/openai";
import { hasPaywallCookie } from "@/lib/paywall";
import { listIndexedReposForUser } from "@/lib/repositories";
import { getSessionFromCookies } from "@/lib/session";
import { searchRepository } from "@/lib/vector-db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const paid = await hasPaywallCookie();
  if (!paid) {
    return NextResponse.json({ error: "Paid access required" }, { status: 402 });
  }

  const payload = (await request.json()) as { repository?: string; query?: string };
  const repository = payload.repository?.trim();
  const query = payload.query?.trim();

  if (!repository || !query) {
    return NextResponse.json({ error: "repository and query are required" }, { status: 400 });
  }

  const indexedRepos = await listIndexedReposForUser(session.user.login);
  const ownsRepository = indexedRepos.some((repo) => repo.fullName === repository);

  if (!ownsRepository) {
    return NextResponse.json(
      { error: "Repository is not indexed for this account. Sync it first from Dashboard." },
      { status: 404 }
    );
  }

  try {
    const matches = await searchRepository(repository, query, 8);
    const answer = await answerWithContext(query, matches);

    return NextResponse.json({
      repository,
      query,
      answer,
      matches
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed due to upstream API or indexing issue." },
      { status: 500 }
    );
  }
}
