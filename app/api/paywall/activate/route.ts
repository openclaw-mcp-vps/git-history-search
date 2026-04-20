import { NextResponse } from "next/server";
import { findActivePurchase, setPaywallCookie } from "@/lib/paywall";
import { getSessionFromCookies } from "@/lib/session";

export async function POST(): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const purchase = await findActivePurchase([session.user.login, session.user.email || ""]);

  if (!purchase) {
    return NextResponse.json(
      { error: "No active Lemon Squeezy purchase found for this GitHub account yet." },
      { status: 404 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    message: `Access enabled for ${purchase.plan} plan.`
  });

  setPaywallCookie(response, purchase.plan);

  return response;
}
