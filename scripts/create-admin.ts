import "dotenv/config";
/**
 * Create or reset an admin login.
 *
 *   npm run create-admin -- --username admin
 *
 * Prompts for the password with echo off. Nothing is hardcoded and nothing is
 * printed — the demo shipped `admin` / `shilpa@admin123` in its seed file and
 * baked that hash into a database that was committed to git.
 */
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function prompt(question: string, silent = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (silent) {
    // Suppress echo while the password is typed.
    const output = rl as unknown as {
      output: NodeJS.WriteStream;
      _writeToOutput: (s: string) => void;
    };
    output._writeToOutput = function (s: string) {
      if (s.includes(question)) output.output.write(s);
    };
  }

  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      if (silent) process.stdout.write("\n");
      rl.close();
      resolve(answer);
    }),
  );
}

async function main() {
  const username = arg("--username") ?? (await prompt("Username: "));
  if (!username.trim()) throw new Error("Username is required");

  const password = process.env.ADMIN_PASSWORD ?? (await prompt("Password: ", true));
  if (password.length < 12) {
    throw new Error("Use at least 12 characters — this login owns the catalog.");
  }

  const confirm = process.env.ADMIN_PASSWORD
    ? password
    : await prompt("Confirm password: ", true);
  if (password !== confirm) throw new Error("Passwords don't match");

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { username: username.trim() },
    update: { passwordHash },
    create: { username: username.trim(), passwordHash },
  });

  console.log(`Admin "${admin.username}" is ready. Sign in at /admin/login`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
