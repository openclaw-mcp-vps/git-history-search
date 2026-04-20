import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanTier } from "@/lib/paywall";

export const PLAN_CONFIG: Record<PlanTier, { label: string; priceLabel: string; repoLimit: number }> = {
  starter: {
    label: "Starter",
    priceLabel: "$9/mo",
    repoLimit: 1
  },
  team: {
    label: "Team",
    priceLabel: "$39/mo",
    repoLimit: 10
  }
};

function buildBaseCheckoutUrl(): string {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID?.trim();

  if (!productId) {
    return "";
  }

  if (productId.startsWith("https://")) {
    return productId;
  }

  return `https://checkout.lemonsqueezy.com/buy/${productId}`;
}

export function buildCheckoutUrl(
  plan: PlanTier,
  context: { login?: string; email?: string } = {}
): string {
  const base = buildBaseCheckoutUrl();
  if (!base) {
    return "";
  }

  const url = new URL(base);
  url.searchParams.set("embed", "1");
  url.searchParams.set("checkout[custom][plan]", plan);

  if (context.login) {
    url.searchParams.set("checkout[custom][login]", context.login);
  }

  if (context.email) {
    url.searchParams.set("checkout[email]", context.email);
    url.searchParams.set("checkout[custom][email]", context.email);
  }

  return url.toString();
}

export function verifyLemonSignature(payload: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    const left = Buffer.from(digest, "hex");
    const right = Buffer.from(signatureHeader, "hex");
    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function extractPlan(value: unknown): PlanTier {
  return value === "team" ? "team" : "starter";
}
