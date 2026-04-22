import crypto from "node:crypto";

import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import type { NextRequest, NextResponse } from "next/server";

export const PAID_ACCESS_COOKIE = "ghs_paid_access";
export const PAID_EMAIL_COOKIE = "ghs_paid_email";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface StripeWebhookEvent {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
}

export function getPaymentLink(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasPaidAccess(request: NextRequest): boolean {
  return request.cookies.get(PAID_ACCESS_COOKIE)?.value === "true";
}

export function setPaidAccessCookies(response: NextResponse, email: string): void {
  const normalized = normalizeEmail(email);
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(PAID_ACCESS_COOKIE, "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set(PAID_EMAIL_COOKIE, normalized, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearPaidAccessCookies(response: NextResponse): void {
  response.cookies.set(PAID_ACCESS_COOKIE, "", {
    maxAge: 0,
    path: "/",
  });
  response.cookies.set(PAID_EMAIL_COOKIE, "", {
    maxAge: 0,
    path: "/",
  });
}

function safeCompare(hexA: string, hexB: string): boolean {
  if (hexA.length !== hexB.length) {
    return false;
  }

  const a = Buffer.from(hexA, "hex");
  const b = Buffer.from(hexB, "hex");
  return crypto.timingSafeEqual(a, b);
}

export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return safeCompare(expected, signature);
}

function getStringField(
  obj: Record<string, unknown>,
  key: string,
): string | null {
  const value = obj[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}

export function extractPaidEmailFromStripeEvent(event: StripeWebhookEvent): string | null {
  const object = event.data?.object;
  if (!object) {
    return null;
  }

  const customerEmail = getStringField(object, "customer_email");
  if (customerEmail) {
    return normalizeEmail(customerEmail);
  }

  const customerDetails = object.customer_details;
  if (
    typeof customerDetails === "object" &&
    customerDetails !== null &&
    "email" in customerDetails &&
    typeof (customerDetails as { email?: unknown }).email === "string"
  ) {
    return normalizeEmail((customerDetails as { email: string }).email);
  }

  const billingDetails = object.billing_details;
  if (
    typeof billingDetails === "object" &&
    billingDetails !== null &&
    "email" in billingDetails &&
    typeof (billingDetails as { email?: unknown }).email === "string"
  ) {
    return normalizeEmail((billingDetails as { email: string }).email);
  }

  return null;
}

export function setupLemonSqueezy(): void {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    return;
  }

  lemonSqueezySetup({
    apiKey,
    onError: () => {
      return;
    },
  });
}
