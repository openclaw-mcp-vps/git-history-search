"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PricingCardsProps {
  userLogin?: string;
  userEmail?: string;
  showActivationButton?: boolean;
}

interface Plan {
  id: "starter" | "team";
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  highlight?: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    title: "Starter",
    price: "$9/mo",
    subtitle: "One repository. Perfect for personal ownership and deep incident work.",
    features: [
      "Index commits, PRs, and issues for one repo",
      "Natural-language search with citations",
      "Unlimited queries",
      "Webhook-based purchase verification"
    ]
  },
  {
    id: "team",
    title: "Team",
    price: "$39/mo",
    subtitle: "Up to ten repositories for shared services and platform teams.",
    features: [
      "Index up to ten repositories",
      "Cross-repo debugging during incidents",
      "Faster onboarding across codebases",
      "Priority support and migration help"
    ],
    highlight: "Most popular"
  }
];

function buildCheckoutLink(
  plan: "starter" | "team",
  userLogin?: string,
  userEmail?: string
): string {
  const configured = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID?.trim();
  if (!configured) {
    return "";
  }

  const base = configured.startsWith("https://")
    ? configured
    : `https://checkout.lemonsqueezy.com/buy/${configured}`;

  const url = new URL(base);
  url.searchParams.set("embed", "1");
  url.searchParams.set("checkout[custom][plan]", plan);

  if (userLogin) {
    url.searchParams.set("checkout[custom][login]", userLogin);
  }

  if (userEmail) {
    url.searchParams.set("checkout[email]", userEmail);
    url.searchParams.set("checkout[custom][email]", userEmail);
  }

  return url.toString();
}

export function PricingCards({
  userLogin,
  userEmail,
  showActivationButton = false
}: PricingCardsProps) {
  const [activationState, setActivationState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [activationMessage, setActivationMessage] = useState<string>("");

  const checkoutLinks = useMemo(() => {
    return {
      starter: buildCheckoutLink("starter", userLogin, userEmail),
      team: buildCheckoutLink("team", userLogin, userEmail)
    };
  }, [userEmail, userLogin]);

  async function activatePurchase() {
    setActivationState("loading");
    setActivationMessage("");

    try {
      const response = await fetch("/api/paywall/activate", {
        method: "POST"
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setActivationState("error");
        setActivationMessage(payload.error || "Purchase not found yet. Give the webhook 10-20 seconds and retry.");
        return;
      }

      setActivationState("success");
      setActivationMessage(payload.message || "Purchase verified. Reloading dashboard...");
      window.setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      setActivationState("error");
      setActivationMessage("Activation request failed. Check connectivity and retry.");
    }
  }

  return (
    <div className="space-y-6">
      <Script src="https://assets.lemonsqueezy.com/lemon.js" strategy="afterInteractive" />

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan, index) => {
          const href = checkoutLinks[plan.id];

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
            >
              <Card className="h-full border-slate-800 bg-slate-950/80">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <CardTitle className="text-2xl">{plan.title}</CardTitle>
                    {plan.highlight ? <Badge variant="success">{plan.highlight}</Badge> : null}
                  </div>
                  <p className="text-4xl font-bold text-slate-100">{plan.price}</p>
                  <CardDescription>{plan.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-sky-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  {href ? (
                    <a
                      href={href}
                      className="lemonsqueezy-button inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
                    >
                      <CreditCard className="h-4 w-4" />
                      Start {plan.title} Checkout
                    </a>
                  ) : (
                    <Button variant="secondary" className="w-full" disabled>
                      Set NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID to enable checkout
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {showActivationButton ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="mb-3 text-sm text-slate-300">
            After checkout, click to activate your paid access cookie for this browser session.
          </p>
          <Button onClick={activatePurchase} disabled={activationState === "loading"} variant="outline">
            {activationState === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking purchase...
              </>
            ) : (
              "I completed checkout"
            )}
          </Button>
          {activationMessage ? (
            <p
              className={`mt-3 text-sm ${
                activationState === "success" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {activationMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
