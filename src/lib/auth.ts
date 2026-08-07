import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

/**
 * The demo stored the admin's raw database id in a cookie and its middleware
 * only checked that *some* cookie was present, so `shilpa_session=anything`
 * was a valid login. Sessions here are signed JWTs and the signature is
 * verified on every request.
 *
 * `jose` is used rather than a Node crypto helper because middleware runs on
 * the edge runtime, where Node's crypto and bcrypt aren't available.
 */

export const SESSION_COOKIE = "shilpa_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  sub: string; // admin id
  username: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub, username: String(payload.username ?? "") };
  } catch {
    // Expired, tampered, or signed with a different secret.
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

/** Current session in a server component or route handler, or null. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Guard for mutating route handlers. Returns a 401 response to return early,
 * or null when the caller is authenticated.
 *
 * Every write handler calls this. Middleware is a convenience for redirecting
 * browsers, not the security boundary — in the demo it was the only check, and
 * because its matcher didn't cover /api, anyone could DELETE the whole catalog.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  return null;
}
