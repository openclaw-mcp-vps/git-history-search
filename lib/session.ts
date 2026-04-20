import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/storage";

export const SESSION_COOKIE = "ghs_session";
export const OAUTH_STATE_COOKIE = "ghs_oauth_state";

export interface AuthUser {
  id: number;
  login: string;
  name: string;
  email?: string;
  avatarUrl: string;
}

export interface SessionRecord {
  id: string;
  accessToken: string;
  user: AuthUser;
  createdAt: string;
}

type SessionStore = Record<string, SessionRecord>;

const SESSIONS_FILE = "sessions.json";
const SESSION_TTL_DAYS = 30;

function sessionExpired(createdAt: string) {
  const createdMs = new Date(createdAt).getTime();
  const ttlMs = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return Number.isNaN(createdMs) || Date.now() - createdMs > ttlMs;
}

async function loadSessions(): Promise<SessionStore> {
  const store = await readStore<SessionStore>(SESSIONS_FILE, {});
  let mutated = false;

  for (const [id, session] of Object.entries(store)) {
    if (sessionExpired(session.createdAt)) {
      delete store[id];
      mutated = true;
    }
  }

  if (mutated) {
    await writeStore(SESSIONS_FILE, store);
  }

  return store;
}

export async function createSession(accessToken: string, user: AuthUser): Promise<SessionRecord> {
  const sessions = await loadSessions();
  const id = randomUUID();
  const session: SessionRecord = {
    id,
    accessToken,
    user,
    createdAt: new Date().toISOString()
  };

  sessions[id] = session;
  await writeStore(SESSIONS_FILE, sessions);

  return session;
}

export async function getSessionById(sessionId: string | undefined): Promise<SessionRecord | null> {
  if (!sessionId) {
    return null;
  }

  const sessions = await loadSessions();
  const session = sessions[sessionId];

  if (!session) {
    return null;
  }

  if (sessionExpired(session.createdAt)) {
    delete sessions[sessionId];
    await writeStore(SESSIONS_FILE, sessions);
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    return;
  }

  const sessions = await loadSessions();
  if (!sessions[sessionId]) {
    return;
  }

  delete sessions[sessionId];
  await writeStore(SESSIONS_FILE, sessions);
}

export async function getSessionFromCookies(): Promise<SessionRecord | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionById(sessionId);
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function setOAuthStateCookie(response: NextResponse, state: string): void {
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  });
}

export function clearOAuthStateCookie(response: NextResponse): void {
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
