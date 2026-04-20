import { NextRequest, NextResponse } from "next/server";
import { extractPlan, PLAN_CONFIG, verifyLemonSignature } from "@/lib/lemonsqueezy";
import { type PurchaseStatus, upsertPurchase } from "@/lib/paywall";

interface LemonPayload {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      user_email?: string;
    };
  };
}

function isActiveStatus(status: string | undefined): PurchaseStatus {
  const normalized = (status || "active").toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }

  if (normalized === "expired") {
    return "expired";
  }

  return "active";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawPayload = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawPayload, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: LemonPayload;
  try {
    payload = JSON.parse(rawPayload) as LemonPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name || "unknown";

  if (
    ![
      "order_created",
      "subscription_created",
      "subscription_updated",
      "subscription_resumed",
      "subscription_cancelled",
      "subscription_expired"
    ].includes(eventName)
  ) {
    return NextResponse.json({ received: true, ignored: true, eventName });
  }

  const customData = payload.meta?.custom_data || {};
  const login = typeof customData.login === "string" ? customData.login : undefined;
  const customEmail = typeof customData.email === "string" ? customData.email : undefined;
  const userEmail = payload.data?.attributes?.user_email || customEmail;
  const plan = extractPlan(customData.plan);
  const config = PLAN_CONFIG[plan];
  const identifiers = [login, userEmail].filter((value): value is string => Boolean(value));

  if (identifiers.length === 0) {
    return NextResponse.json(
      { error: "Webhook did not include login or email identifier." },
      { status: 400 }
    );
  }

  const status = isActiveStatus(payload.data?.attributes?.status);

  await upsertPurchase(identifiers, {
    plan,
    repoLimit: config.repoLimit,
    orderId: payload.data?.id || `event:${eventName}`,
    status,
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({
    received: true,
    eventName,
    plan,
    status
  });
}
