import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Build the DB URL with the correct parameters for the current environment.
 *
 * On Vercel (serverless), each function invocation runs in an isolated
 * process so `globalThis` is NOT shared across requests — the singleton
 * pattern only helps during local development (Next.js long-lived Node
 * process) to avoid spawning thousands of clients during hot-reloads.
 *
 * Supabase + PgBouncer requirements:
 *  - `pgbouncer=true`  — tells Prisma to use transaction-mode pooling
 *  - `connection_limit=1` — each serverless function should hold at most
 *    one Postgres connection; PgBouncer handles the actual pooling.
 *    More than 1 per function wastes slots and causes P2024 timeouts.
 *  - `pool_timeout=30`  — wait up to 30 s before giving up (default 10 s
 *    is too short for cold Supabase connections on the free tier).
 *  - `connect_timeout=30` — TCP/TLS handshake budget.
 *  - `socket_timeout=30`  — read/write timeout per query.
 */
function buildDbUrl(): string {
  const raw = process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "";
  const url = raw.trim().replace(/^['"]|['"]$/g, "");

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    const parsed = new URL(url);

    // Always enforce PgBouncer-compatible settings.
    parsed.searchParams.set("pgbouncer", "true");

    // On Vercel serverless each invocation is a separate process so there
    // is genuinely only 1 connection needed.  Using more causes P2024.
    parsed.searchParams.set("connection_limit", "1");

    // Give cold Supabase connections enough headroom.
    parsed.searchParams.set("pool_timeout", "30");
    parsed.searchParams.set("connect_timeout", "30");
    parsed.searchParams.set("socket_timeout", "30");

    // Supabase requires TLS.
    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }

    return parsed.toString();
  } catch {
    // URL parsing failed — return raw and hope for the best.
    return url;
  }
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: { db: { url: buildDbUrl() } },
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

/**
 * Export a singleton.  In dev the Next.js process is long-lived, so we
 * stash the client on `globalThis` to avoid "too many clients" during
 * hot-reloads.  In production (Vercel) each function invocation is a
 * fresh process, so globalForPrisma.prisma is always undefined and we
 * just create a new client — but that is fine because `connection_limit=1`
 * ensures we only open one Postgres connection per invocation.
 */
export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
