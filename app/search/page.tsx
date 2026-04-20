import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SearchInterface } from "@/components/search-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPaywallCookie } from "@/lib/paywall";
import { listIndexedReposForUser } from "@/lib/repositories";
import { getSessionFromCookies } from "@/lib/session";

export const metadata = {
  title: "Search",
  description: "Search commits, PRs, and issues with natural language."
};

export default async function SearchPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/dashboard");
  }

  const paid = await hasPaywallCookie();
  if (!paid) {
    redirect("/dashboard");
  }

  const repos = await listIndexedReposForUser(session.user.login);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-400">Semantic Search</p>
          <h1 className="text-4xl font-semibold">Ask Your Git History</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {repos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No indexed repositories yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>
              Go to the dashboard, sync at least one repository, then return here to run natural-language
              history search.
            </p>
            <Button asChild>
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SearchInterface repos={repos} />
      )}
    </main>
  );
}
