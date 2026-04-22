import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  buildGitHubAuthorizeUrl,
  exchangeGitHubCodeForToken,
  fetchGitHubViewer,
  GITHUB_LOGIN_COOKIE,
  GITHUB_STATE_COOKIE,
  GITHUB_TOKEN_COOKIE,
} from "@/lib/github";

export const runtime = "nodejs";

function cookieSecurity() {
  return process.env.NODE_ENV === "production";
}

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shouldDisconnect = searchParams.get("disconnect") === "1";

  if (shouldDisconnect) {
    const response = NextResponse.redirect(new URL("/dashboard?github=disconnected", request.url));
    response.cookies.set(GITHUB_TOKEN_COOKIE, "", {
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(GITHUB_LOGIN_COOKIE, "", {
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(GITHUB_STATE_COOKIE, "", {
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  if (!code) {
    try {
      const generatedState = crypto.randomBytes(24).toString("hex");
      const authorizeUrl = buildGitHubAuthorizeUrl(
        `${request.nextUrl.protocol}//${request.nextUrl.host}`,
        generatedState,
      );

      const response = NextResponse.redirect(authorizeUrl);
      response.cookies.set(GITHUB_STATE_COOKIE, generatedState, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecurity(),
        maxAge: 60 * 10,
        path: "/",
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to begin GitHub OAuth";
      return redirectWithError(request, message);
    }
  }

  const expectedState = request.cookies.get(GITHUB_STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "Invalid OAuth state. Please retry GitHub connect.");
  }

  try {
    const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const token = await exchangeGitHubCodeForToken(code, origin);
    const viewer = await fetchGitHubViewer(token);

    const response = NextResponse.redirect(new URL("/dashboard?github=connected", request.url));

    response.cookies.set(GITHUB_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecurity(),
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    response.cookies.set(GITHUB_LOGIN_COOKIE, viewer.login, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecurity(),
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    response.cookies.set(GITHUB_STATE_COOKIE, "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub OAuth callback failed";
    return redirectWithError(request, message);
  }
}
