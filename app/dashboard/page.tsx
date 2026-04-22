import type { Metadata } from "next";
import { cookies } from "next/headers";

import { RepoConnector } from "@/components/repo-connector";
import { SearchInterface } from "@/components/search-interface";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GITHUB_TOKEN_COOKIE } from "@/lib/github";
import { PAID_ACCESS_COOKIE } from "@/lib/lemonsqueezy";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Connect repositories, sync git history, and search commits with natural language.",
};

interface DashboardPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getParamValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

const dashboardErrors: Record<string, string> = {
  "missing-email": "Enter the same email used at Stripe checkout.",
  "payment-not-found": "No successful payment is on record for that email yet. If you just paid, wait 1 minute and retry.",
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const selectedRepo = getParamValue(params.repo) ?? "";
  const errorCode = getParamValue(params.error);
  const accessGranted = getParamValue(params.access) === "granted";

  const cookieStore = await cookies();
  const hasPaidAccess = cookieStore.get(PAID_ACCESS_COOKIE)?.value === "true";
  const hasGitHubConnection = Boolean(cookieStore.get(GITHUB_TOKEN_COOKIE)?.value);
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-8 text-zinc-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#111827] p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-14 right-0 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Git History Search Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
            Connect GitHub, sync repository history into embeddings, and ask natural-language questions like
            "which PR fixed auth bugs" with traceable links to commits and issues.
          </p>
        </section>

        {!hasPaidAccess ? (
          <Card className="border border-cyan-500/25 bg-[#111827]/90">
            <CardHeader>
              <CardTitle className="text-white">Unlock access</CardTitle>
              <CardDescription>
                The working search tool is paywalled. Checkout is handled by Stripe Payment Link, then claim access with the same email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentLink ? (
                <a href={paymentLink} className="inline-flex">
                  <Button className="h-10 bg-cyan-600 px-5 text-white hover:bg-cyan-500">Buy access on Stripe</Button>
                </a>
              ) : (
                <p className="text-sm text-amber-300">
                  NEXT_PUBLIC_STRIPE_PAYMENT_LINK is not set. Add it in your environment.
                </p>
              )}

              <form action="/api/access/claim" method="post" className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@company.com"
                  className="h-10 rounded-lg border border-white/15 bg-[#0b1220] px-3 text-sm text-zinc-100 outline-none ring-cyan-500/30 focus:ring"
                />
                <Button type="submit" className="h-10 bg-zinc-100 text-zinc-900 hover:bg-white">
                  Claim paid access
                </Button>
              </form>

              {errorCode ? <p className="text-sm text-rose-300">{dashboardErrors[errorCode] ?? errorCode}</p> : null}

              <Accordion type="single" collapsible>
                <AccordionItem value="billing-help" className="border-white/10">
                  <AccordionTrigger className="text-sm text-zinc-100">Why do I need to claim access?</AccordionTrigger>
                  <AccordionContent className="text-sm text-zinc-300">
                    Stripe webhooks mark your purchase server-side. Claiming with your checkout email creates your dashboard cookie so future API
                    calls are automatically authorized.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ) : (
          <>
            {accessGranted ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Access granted. You can now sync repositories and run semantic history search.
              </p>
            ) : null}

            <RepoConnector hasGitHubConnection={hasGitHubConnection} selectedRepo={selectedRepo} />
            <SearchInterface repoFullName={selectedRepo} />
          </>
        )}
      </div>
    </main>
  );
}
