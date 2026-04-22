import { NextRequest, NextResponse } from "next/server";

import { getEntitlementByEmail } from "@/lib/db";
import { setPaidAccessCookies } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

async function parseEmail(request: NextRequest): Promise<{ email: string | null; fromForm: boolean }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    return {
      email: typeof body?.email === "string" ? body.email : null,
      fromForm: false,
    };
  }

  const form = await request.formData().catch(() => null);
  return {
    email: typeof form?.get("email") === "string" ? String(form.get("email")) : null,
    fromForm: true,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email, fromForm } = await parseEmail(request);
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  if (!normalizedEmail) {
    if (fromForm) {
      return NextResponse.redirect(new URL("/dashboard?error=missing-email", request.url));
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Email is required.",
      },
      { status: 400 },
    );
  }

  const entitlement = await getEntitlementByEmail(normalizedEmail);
  if (!entitlement) {
    if (fromForm) {
      return NextResponse.redirect(new URL("/dashboard?error=payment-not-found", request.url));
    }
    return NextResponse.json(
      {
        ok: false,
        error: "No completed Stripe payment found for this email yet.",
      },
      { status: 404 },
    );
  }

  if (fromForm) {
    const response = NextResponse.redirect(new URL("/dashboard?access=granted", request.url));
    setPaidAccessCookies(response, normalizedEmail);
    return response;
  }

  const response = NextResponse.json({ ok: true, email: normalizedEmail });
  setPaidAccessCookies(response, normalizedEmail);
  return response;
}
