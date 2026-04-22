import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bug, Clock3, FileSearch2, ShieldAlert, Sparkles } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Git History Search",
  description:
    "Ask plain-English questions over commits, pull requests, and issues. Find auth-flow changes, bug fixes, and rollout context in seconds.",
};

const faq = [
  {
    question: "What data gets indexed?",
    answer:
      "Git History Search pulls commit messages plus diff snippets, pull request titles and descriptions, and issue titles/body text. Every result links back to the exact GitHub source.",
  },
  {
    question: "Can I trust the answer during incident response?",
    answer:
      "Yes for navigation, not blind automation. The tool gives ranked evidence and direct links so engineers can verify context quickly before making production changes.",
  },
  {
    question: "How is access controlled?",
    answer:
      "Stripe checkout grants entitlement. A secure cookie unlocks the dashboard after purchase claim, and GitHub OAuth controls which repositories can be synced.",
  },
  {
    question: "Who benefits most?",
    answer:
      "Staff engineers onboarding to legacy codebases, incident commanders tracing regressions, and platform teams reducing mean-time-to-context during debugging.",
  },
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="bg-[#0d1117] text-zinc-100">
      <div className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,0.18),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.14),transparent_38%),linear-gradient(180deg,#0d1117,#0d1117)]" />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <FileSearch2 className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold tracking-wide text-zinc-100">Git History Search</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-zinc-300 hover:text-white">
              Dashboard
            </Link>
            {paymentLink ? (
              <a href={paymentLink} className="inline-flex">
                <Button className="h-9 bg-cyan-600 px-4 text-white hover:bg-cyan-500">Buy now</Button>
              </a>
            ) : null}
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:pb-20">
          <div>
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-200">Dev Productivity</Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Find every commit that touched the auth flow, in plain English.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              `git log` should not be a grep contest. Ask questions like “which PRs fixed auth bugs?” or “when did we add rate
              limiting?” and get ranked evidence across commits, pull requests, and issues.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {paymentLink ? (
                <a href={paymentLink} className="inline-flex">
                  <Button className="h-11 gap-2 bg-cyan-600 px-6 text-white hover:bg-cyan-500">
                    Start indexing repos
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Button disabled className="h-11 bg-zinc-700 px-6 text-zinc-200">
                  Add Stripe Payment Link in env
                </Button>
              )}
              <Link href="/dashboard" className="inline-flex">
                <Button variant="outline" className="h-11 border-white/20 bg-transparent px-6 text-zinc-200 hover:bg-white/5">
                  Open dashboard
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-zinc-400">$9/mo per repo • $39/mo for up to 10 repos</p>
          </div>

          <Card className="border border-cyan-500/25 bg-[#111827]/90">
            <CardHeader>
              <CardTitle className="text-zinc-100">What engineers ask in production</CardTitle>
              <CardDescription>Real search prompts that return linked commit evidence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Which PR rolled back strict JWT validation?",
                "Show commits that changed login rate limits in the API gateway.",
                "When did we introduce session refresh retries?",
                "Which issues mention auth timeout regressions after deploy?",
              ].map((prompt) => (
                <div key={prompt} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
                  {prompt}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-10">
        <Card className="border border-white/10 bg-[#111827]/85">
          <CardHeader>
            <div className="mb-2 inline-flex w-fit rounded-full bg-rose-500/20 p-2 text-rose-200">
              <Bug className="h-4 w-4" />
            </div>
            <CardTitle className="text-zinc-100">Problem</CardTitle>
            <CardDescription>
              Teams lose hours stitching context from commit logs, stale issue threads, and scattered PR conversations.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border border-white/10 bg-[#111827]/85">
          <CardHeader>
            <div className="mb-2 inline-flex w-fit rounded-full bg-cyan-500/20 p-2 text-cyan-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <CardTitle className="text-zinc-100">Solution</CardTitle>
            <CardDescription>
              AI semantic search over commit messages, diffs, PRs, and issues with one query and source links.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border border-white/10 bg-[#111827]/85">
          <CardHeader>
            <div className="mb-2 inline-flex w-fit rounded-full bg-emerald-500/20 p-2 text-emerald-200">
              <Clock3 className="h-4 w-4" />
            </div>
            <CardTitle className="text-zinc-100">Outcome</CardTitle>
            <CardDescription>
              Faster onboarding, shorter incident timelines, and better confidence in when and why behavior changed.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-10">
        <Separator className="bg-white/10" />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-10">
        <Card className="border border-cyan-500/35 bg-gradient-to-br from-cyan-500/10 to-sky-500/5">
          <CardHeader>
            <CardTitle className="text-zinc-100">Starter</CardTitle>
            <CardDescription>For solo engineers owning one critical repo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold text-white">$9/mo</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>1 indexed repository</li>
              <li>Commit + PR + issue semantic search</li>
              <li>Natural-language query interface</li>
            </ul>
            {paymentLink ? (
              <a href={paymentLink} className="inline-flex">
                <Button className="h-10 bg-cyan-600 text-white hover:bg-cyan-500">Buy Starter</Button>
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
          <CardHeader>
            <div className="mb-1 inline-flex w-fit rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
              Best for platform teams
            </div>
            <CardTitle className="text-zinc-100">Team</CardTitle>
            <CardDescription>Cross-repo debugging for staff-level ownership</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold text-white">$39/mo</p>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li>Up to 10 repositories</li>
              <li>Shared query workflows for onboarding</li>
              <li>Fast incident context across services</li>
            </ul>
            {paymentLink ? (
              <a href={paymentLink} className="inline-flex">
                <Button className="h-10 bg-emerald-600 text-white hover:bg-emerald-500">Buy Team</Button>
              </a>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-amber-500/20 p-2 text-amber-200">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">FAQ</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Questions teams ask before adopting semantic git history search in production workflows.
          </p>
        </div>
        <Card className="border border-white/10 bg-[#111827]/85">
          <CardContent className="pt-4">
            <Accordion type="single" collapsible>
              {faq.map((item) => (
                <AccordionItem key={item.question} value={item.question} className="border-white/10">
                  <AccordionTrigger className="text-zinc-100">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-zinc-300">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
