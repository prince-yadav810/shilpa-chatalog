import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { checkRateLimit, clearRateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = clientKey(req);
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many attempts. Try again in ${Math.ceil(
          limit.retryAfterSeconds / 60,
        )} minutes.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return NextResponse.json(
      { error: "Enter your username and password" },
      { status: 400 },
    );
  }

  const admin = await prisma.admin.findUnique({
    where: { username: username.trim() },
  });

  // Same generic message whether the user exists or the password is wrong —
  // otherwise the response tells an attacker which usernames are real.
  const invalid = NextResponse.json(
    { error: "Incorrect username or password" },
    { status: 401 },
  );

  if (!admin) {
    // Spend comparable time so a missing user isn't detectable by timing.
    await bcrypt.compare(password, "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltuu");
    return invalid;
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return invalid;

  clearRateLimit(key);

  const token = await createSessionToken({
    sub: admin.id,
    username: admin.username,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ ok: true });
}
