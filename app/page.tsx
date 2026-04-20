import Link from "next/link";
import { ArrowRight, Bug, Clock3, GitPullRequest, SearchCheck, ShieldCheck } from "lucide-react";
import { PricingCards } from "@/components/pricing-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    q: "How is this better than `git log --grep`?",
    a: "Git History Search reads commit diffs, PR bodies, and issue titles together, then ranks evidence semantically. You can ask intent-level questions like \"when did auth regressions start?\" instead of guessing exact keywords."
  },
  {
    q: "What does indexing include?",
    a: "Each sync pulls recent commits with diff snippets, recently closed PRs, and recent issues, then embeds them for semantic retrieval. You can refresh anytime after major merges."
  },
  {
    q: "Is this safe for private repositories?",
    a: "GitHub OAuth tokens are stored in server-side session files and sent only to GitHub API endpoints for read operations. Paid access uses HttpOnly cookies."
  },
  {
    q: "Who buys this?",
    a: "Staff and principal engineers who debug incidents, investigate regressions, and onboard to unfamiliar services. It saves time every time context switching hits."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10 md:py-14">
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-8 md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <p className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-widest text-sky-300">
            Git History Search
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            Find all commits that touched auth flow, in plain English.
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-slate-300">
            Ask: "which PRs fixed auth bugs?" or "when did we add rate limiting?" We search commits,
            diffs, PRs, and issues and return evidence with direct links.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                Connect GitHub and Start
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/search">View Search Experience</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Clock3 className="h-6 w-6 text-sky-400" />
            <CardTitle className="mt-2 text-lg">Problem: grep contest</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Post-incident investigations turn into fragile grep chains and manual click-through across
            commits and PRs.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SearchCheck className="h-6 w-6 text-sky-400" />
            <CardTitle className="mt-2 text-lg">Solution: semantic history retrieval</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            We index commit messages, diff snippets, PR text, and issue metadata into vectors for
            natural-language search.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Bug className="h-6 w-6 text-sky-400" />
            <CardTitle className="mt-2 text-lg">Outcome: faster debugging + onboarding</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Staff engineers answer "why did this behavior change?" in minutes with cited, linked
            repository history.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="flex gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-sky-400" />
              <p>Authenticate with GitHub OAuth and choose a repository you can access.</p>
            </div>
            <div className="flex gap-3">
              <GitPullRequest className="mt-1 h-5 w-5 shrink-0 text-sky-400" />
              <p>Sync commits, PRs, and issues. We build a searchable vector index from real history.</p>
            </div>
            <div className="flex gap-3">
              <SearchCheck className="mt-1 h-5 w-5 shrink-0 text-sky-400" />
              <p>
                Ask natural-language questions and get ranked evidence with links you can open during
                incident triage.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Who Pays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              Ideal for staff engineers responsible for critical services and for new team members
              onboarding into mature codebases.
            </p>
            <p>
              Every production investigation needs historical context. This product removes the manual
              archaeology.
            </p>
            <p className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-slate-200">
              Niche: <strong>dev-productivity</strong> for multi-service teams with complex auth,
              reliability, and rollout history.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="pricing" className="space-y-5">
        <h2 className="text-3xl font-semibold">Pricing</h2>
        <p className="text-slate-300">Simple monthly plans aligned to repository count and team size.</p>
        <PricingCards />
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <Card key={item.q}>
              <CardHeader>
                <CardTitle className="text-lg">{item.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-300">{item.a}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
