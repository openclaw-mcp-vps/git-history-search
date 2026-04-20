import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  clearOAuthStateCookie,
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionFromCookies,
  OAUTH_STATE_COOKIE,
  setOAuthStateCookie,
  setSessionCookie
} from "@/lib/session";
import { clearPaywallCookie } from "@/lib/paywall";
import {
  exchangeCodeForToken,
  getAuthenticatedUser,
  listAccessibleRepos
} from "@/lib/github";

function appUrl(request: NextRequest): URL {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
}

function missingOAuthConfig() {
  return !process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET;
}

async function handleLogin(request: NextRequest): Promise<NextResponse> {
  if (missingOAuthConfig()) {
    return NextResponse.json(
      { error: "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  const redirectBase = appUrl(request);
  const callbackUrl = new URL("/api/auth/github", redirectBase).toString();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  const state = randomUUID();

  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID || "");
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "repo read:user user:email");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  setOAuthStateCookie(response, state);
  return response;
}

async function handleCallback(request: NextRequest, code: string, state: string): Promise<NextResponse> {
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL("/dashboard?auth=invalid_state", appUrl(request)));
  }

  try {
    const token = await exchangeCodeForToken(code);
    const user = await getAuthenticatedUser(token);
    const session = await createSession(token, user);

    const response = NextResponse.redirect(new URL("/dashboard", appUrl(request)));
    setSessionCookie(response, session.id);
    clearOAuthStateCookie(response);

    return response;
  } catch (error) {
    console.error("GitHub OAuth callback failed:", error);
    return NextResponse.redirect(new URL("/dashboard?auth=failed", appUrl(request)));
  }
}

async function handleLogout(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (session) {
    await deleteSession(session.id);
  }

  const response = NextResponse.redirect(new URL("/", appUrl(request)));
  clearSessionCookie(response);
  clearOAuthStateCookie(response);
  clearPaywallCookie(response);

  return response;
}

async function handleStatus(): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user
  });
}

async function handleRepos(): Promise<NextResponse> {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const repos = await listAccessibleRepos(session.accessToken);
    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to list GitHub repos:", error);
    return NextResponse.json({ error: "Failed to load repositories" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action");

  if (action === "login") {
    return handleLogin(request);
  }

  if (action === "logout") {
    return handleLogout(request);
  }

  if (action === "status") {
    return handleStatus();
  }

  if (action === "repos") {
    return handleRepos();
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (code && state) {
    return handleCallback(request, code, state);
  }

  return NextResponse.json(
    {
      error: "Unsupported auth request. Use action=login|logout|status|repos or OAuth callback params."
    },
    { status: 400 }
  );
}
