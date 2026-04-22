import { NextRequest, NextResponse } from "next/server";

import { upsertEntitlement } from "@/lib/db";
import {
  extractPaidEmailFromStripeEvent,
  StripeWebhookEvent,
  verifyStripeSignature,
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

const handledStripeEvents = new Set([
  "checkout.session.completed",
  "charge.succeeded",
  "invoice.paid",
  "payment_intent.succeeded",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing STRIPE_WEBHOOK_SECRET",
      },
      { status: 500 },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid webhook signature",
      },
      { status: 400 },
    );
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Webhook body is not valid JSON",
      },
      { status: 400 },
    );
  }

  if (!event.type || !handledStripeEvents.has(event.type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const paidEmail = extractPaidEmailFromStripeEvent(event);
  if (!paidEmail) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not extract a customer email from webhook event",
      },
      { status: 400 },
    );
  }

  await upsertEntitlement({
    email: paidEmail,
    source: `stripe:${event.type}`,
    eventId: event.id,
    grantedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    granted: paidEmail,
  });
}
