import Link from "next/link";
import { ArrowRight, Github, Lock, SearchCode } from "lucide-react";
import { PricingCards } from "@/components/pricing-cards";
import { RepoSelector } from "@/components/repo-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAccessibleRepos } from "@/lib/github";
import { hasPaywallCookie } from "@/lib/paywall";
import { listIndexedReposForUser } from "@/lib/repositories";
import { getSessionFromCookies } from "@/lib/session";

export const metadata = {
  title: "Dashboard",
  description: "Connect repositories, sync history, and unlock semantic git search."
};

export default async function DashboardPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-10">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-3xl">Connect GitHub to Start Indexing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>
              Sign in with GitHub to pull commit history, PRs, and issues from repositories you already
              have access to.
            </p>
            <Button asChild>
              <a href="/api/auth/github?action=login" className="inline-flex items-center gap-2">
                <Github className="h-4 w-4" />
                Continue with GitHub
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const paid = await hasPaywallCookie();

  if (!paid) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-slate-400">Account</p>
          <h1 className="text-4xl font-semibold">Welcome, {session.user.name}</h1>
          <p className="text-slate-300">
            Your GitHub account is connected. Complete checkout to unlock syncing and natural-language
            search.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-sky-400" />
              Paid Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <p>
              Git history indexing and search are behind a paywall. After purchase, activate your access
              cookie on this device.
            </p>
            <PricingCards
              userLogin={session.user.login}
              userEmail={session.user.email}
              showActivationButton
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  const [repos, indexedRepos] = await Promise.all([
    listAccessibleRepos(session.accessToken),
    listIndexedReposForUser(session.user.login)
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-400">Dashboard</p>
          <h1 className="text-4xl font-semibold">Repository Indexing</h1>
          <p className="mt-2 text-slate-300">
            Sync one or more repositories, then ask natural-language questions over real commit history.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <a href="/api/auth/github?action=logout">Sign Out</a>
          </Button>
          <Button asChild>
            <Link href="/search" className="inline-flex items-center gap-2">
              Open Search
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SearchCode className="h-5 w-5 text-sky-400" />
            Connected GitHub User: {session.user.login}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          {repos.length} repositories available in this account. Sync the repo you want to search.
        </CardContent>
      </Card>

      <RepoSelector repos={repos} indexedRepos={indexedRepos} />
    </main>
  );
}
