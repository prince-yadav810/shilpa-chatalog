import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Build the effective DATABASE_URL.
 *
 * Two modes:
 * 1. Prisma Accelerate (`prisma+postgres://`) — pass through unchanged.
 * 2. Direct PostgreSQL — enforce serverless-safe connection settings.
 */
function buildDbUrl(): string {
  const raw = (process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "").trim();
  const url = raw.replace(/^['"]|['"]$/g, "");

  if (!url) throw new Error("DATABASE_URL is not set");

  // Accelerate URLs must be used as-is.
  if (url.startsWith("prisma+postgres://") || url.startsWith("prisma://")) {
    return url;
  }

  // Direct Postgres — enforce serverless-safe connection params.
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("pgbouncer", "true");
    parsed.searchParams.set("connection_limit", "1");
    parsed.searchParams.set("pool_timeout", "30");
    parsed.searchParams.set("connect_timeout", "30");
    parsed.searchParams.set("socket_timeout", "30");
    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Always export a plain PrismaClient.
 * When the DATABASE_URL is a Prisma Accelerate URL, the Accelerate
 * extension is applied at runtime but we cast back to PrismaClient so
 * the rest of the codebase gets stable, non-union types everywhere.
 *
 * The extension is transparent for all query semantics; the only runtime
 * difference is that Accelerate intercepts the network call.
 */
function createPrismaClient(): PrismaClient {
  const url = buildDbUrl();
  const isAccelerate =
    url.startsWith("prisma+postgres://") || url.startsWith("prisma://");

  const base = new PrismaClient({
    datasources: { db: { url } },
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

  if (isAccelerate) {
    // $extends returns an extended client. We cast to PrismaClient so
    // callers keep the standard type — Accelerate is an invisible proxy.
    return base.$extends(withAccelerate()) as unknown as PrismaClient;
  }
  return base;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
