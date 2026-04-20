import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/storage";

export const PAYWALL_COOKIE = "ghs_paid";
export const PLAN_COOKIE = "ghs_plan";

export type PlanTier = "starter" | "team";
export type PurchaseStatus = "active" | "cancelled" | "expired";

export interface PurchaseRecord {
  plan: PlanTier;
  repoLimit: number;
  orderId: string;
  status: PurchaseStatus;
  updatedAt: string;
}

type PurchaseStore = Record<string, PurchaseRecord>;
const PURCHASES_FILE = "purchases.json";

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function identifierKey(identifier: string): string {
  return `id:${normalizeIdentifier(identifier)}`;
}

export async function upsertPurchase(
  identifiers: string[],
  record: PurchaseRecord
): Promise<void> {
  const validIds = identifiers.map(normalizeIdentifier).filter(Boolean);
  if (validIds.length === 0) {
    return;
  }

  const store = await readStore<PurchaseStore>(PURCHASES_FILE, {});
  for (const identifier of validIds) {
    store[identifierKey(identifier)] = record;
  }

  await writeStore(PURCHASES_FILE, store);
}

export async function findActivePurchase(identifiers: string[]): Promise<PurchaseRecord | null> {
  const store = await readStore<PurchaseStore>(PURCHASES_FILE, {});
  const validIds = identifiers.map(normalizeIdentifier).filter(Boolean);

  for (const identifier of validIds) {
    const found = store[identifierKey(identifier)];
    if (found && found.status === "active") {
      return found;
    }
  }

  return null;
}

export async function hasPaywallCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(PAYWALL_COOKIE)?.value === "1";
}

export function setPaywallCookie(response: NextResponse, plan: PlanTier): void {
  response.cookies.set({
    name: PAYWALL_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60
  });

  response.cookies.set({
    name: PLAN_COOKIE,
    value: plan,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60
  });
}

export function clearPaywallCookie(response: NextResponse): void {
  response.cookies.set({
    name: PAYWALL_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  response.cookies.set({
    name: PLAN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
