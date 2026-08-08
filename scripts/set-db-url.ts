/**
 * Write the Supabase connection strings into .env without them passing through
 * a chat transcript or shell history.
 *
 *   npm run set-db-url
 *
 * Prompts for the database password with echo off, URL-encodes it (passwords
 * routinely contain @ : / ? # which would otherwise corrupt the URL), writes
 * DATABASE_URL and DIRECT_URL, and then makes one real query to prove it works.
 *
 * This project has no direct-connection host — db.<ref>.supabase.co does not
 * resolve — so both URLs use the pooler and differ only by port:
 *   6543 transaction pooling  -> DATABASE_URL, what the app runs on
 *   5432 session pooling      -> DIRECT_URL, what Prisma migrates through
 */
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const PROJECT_REF = "mqlriwjsmcxhuifmgmde";
const POOLER_HOST = "aws-0-ap-northeast-1.pooler.supabase.com";

function prompt(question: string, silent = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (silent) {
    const out = rl as unknown as {
      output: NodeJS.WriteStream;
      _writeToOutput: (s: string) => void;
    };
    out._writeToOutput = function (s: string) {
      if (s.includes(question)) out.output.write(s);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (a) => {
      if (silent) process.stdout.write("\n");
      rl.close();
      resolve(a);
    }),
  );
}

function upsertEnv(lines: string[], key: string, value: string): string[] {
  const kept = lines.filter((l) => !l.startsWith(`${key}=`));
  kept.push(`${key}="${value}"`);
  return kept;
}

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD ?? (await prompt("Supabase database password: ", true));
  if (!password.trim()) throw new Error("No password entered.");

  // Passwords commonly contain characters that are structural in a URL.
  const encoded = encodeURIComponent(password.trim());
  const user = `postgres.${PROJECT_REF}`;

  /*
   * connection_limit=5, not 1. The often-quoted "1" is for a serverless
   * request handler; a production build prerenders every product page at once
   * and starves on a single connection ("Timed out fetching a new connection
   * from the connection pool"). Supabase's transaction pooler multiplexes
   * these onto far fewer real Postgres connections.
   */
  const pooled = `postgresql://${user}:${encoded}@${POOLER_HOST}:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=30`;
  const direct = `postgresql://${user}:${encoded}@${POOLER_HOST}:5432/postgres`;

  const envPath = path.resolve(process.cwd(), ".env");
  let lines = existsSync(envPath)
    ? readFileSync(envPath, "utf8").split("\n").filter((l) => l.trim())
    : [];

  lines = upsertEnv(lines, "DATABASE_URL", pooled);
  lines = upsertEnv(lines, "DIRECT_URL", direct);
  writeFileSync(envPath, `${lines.join("\n")}\n`);

  console.log("\n  Written to .env (gitignored):");
  console.log(`    DATABASE_URL  ${POOLER_HOST}:6543  (transaction pooling)`);
  console.log(`    DIRECT_URL    ${POOLER_HOST}:5432  (session pooling, for migrations)`);

  // Prove it actually connects before anyone runs a migration against it.
  process.env.DATABASE_URL = pooled;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ version: string }[]>("select version()");
    console.log(`\n  Connected: ${rows[0].version.split(",")[0]}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.error(`\n  Could NOT connect: ${message}`);
    console.error("  If it says password authentication failed, reset the database");
    console.error("  password in Supabase (Project Settings -> Database) and re-run.\n");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
  process.exitCode = 1;
});
