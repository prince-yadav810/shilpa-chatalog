import "dotenv/config";
/**
 * Collect image candidates for products that still have no photo, following the
 * agreed sourcing order:
 *
 *   1. the manufacturer's own site
 *   2. major marketplaces (1mg, Amazon, Flipkart, Blinkit, Zepto, pharmacies)
 *   3. general search, last resort
 *
 *   npm run search-missing -- --out data/reference/image-candidates.json
 *
 * This only *gathers* candidates and scores them. It writes nothing to the
 * catalog: a human (or the review step) confirms each one first, because the
 * whole point of the exercise is that the photo actually matches the product.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT =
  process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : "data/reference/image-candidates.json";

/** Domains we trust, best first. Index position becomes the tier. */
const TIERS: { label: string; hosts: string[] }[] = [
  { label: "official", hosts: ["vissco.com", "vissconext.com", "connect.vissco.com", "lakmeindia.com", "ponds.in", "simpleskincare.in", "unilever.com"] },
  { label: "marketplace", hosts: ["1mg.com", "amazon.in", "flipkart.com", "blinkit.com", "zeptonow.com", "netmeds.com", "pharmeasy.in", "apollopharmacy.in", "wheelchairindia.com", "medineeds.in", "surginatal.com", "nykaa.com", "purplle.com"] },
];

function tierOf(url: string): { tier: number; label: string } {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return { tier: 2, label: "general" };
  }
  for (const [i, t] of TIERS.entries()) {
    if (t.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return { tier: i, label: t.label };
    }
  }
  return { tier: 2, label: "general" };
}

type Candidate = {
  imageUrl: string;
  pageUrl: string;
  title: string;
  width: number;
  height: number;
  tier: number;
  tierLabel: string;
  codeInUrl: boolean;
  score: number;
};

function firecrawl(query: string): { title: string; imageUrl: string; url: string; imageWidth?: number; imageHeight?: number }[] {
  try {
    const out = execFileSync(
      "npx",
      ["-y", "firecrawl-cli@latest", "search", query, "--sources", "images", "--limit", "8", "--json"],
      { encoding: "utf8", timeout: 120_000, env: { ...process.env, FIRECRAWL_NO_TELEMETRY: "1" } },
    );
    const line = out.split("\n").find((l) => l.trim().startsWith("{"));
    if (!line) return [];
    return JSON.parse(line)?.data?.images ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const rows = await prisma.product.findMany({
    where: { imageUrl: null },
    select: { sku: true, name: true, variant: true, brand: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  // Every catalog-imported product has a SKU; the column is nullable only for
  // rows an admin created by hand, which we can't search for by code anyway.
  const missing = rows.filter((r): r is typeof r & { sku: string } => Boolean(r.sku));

  console.log(`  ${missing.length} products without an image\n`);

  const results: Record<string, { name: string; sku: string; candidates: Candidate[] }> = {};

  // Resume support — these searches cost credits.
  const outPath = path.resolve(process.cwd(), OUT);
  if (existsSync(outPath)) {
    Object.assign(results, JSON.parse(readFileSync(outPath, "utf8")));
  }

  for (const p of missing) {
    if (results[p.sku]) {
      console.log(`  · ${p.sku} (cached)`);
      continue;
    }

    const code = p.sku.replace(/^[A-Z]+-/i, "");
    const brand = p.brand?.name ?? "";
    // Code first: it is the single most reliable discriminator.
    const query = `${brand} ${code} ${p.name}`.replace(/\s+/g, " ").trim();

    const raw = firecrawl(query);
    const candidates: Candidate[] = raw
      .filter((r) => r.imageUrl)
      .map((r) => {
        const { tier, label } = tierOf(r.url ?? r.imageUrl);
        const haystack = `${r.imageUrl} ${r.title ?? ""}`.toLowerCase();
        const codeInUrl = haystack.includes(code.toLowerCase());
        const w = r.imageWidth ?? 0;
        const h = r.imageHeight ?? 0;
        // Lower is better: tier dominates, a code hit outranks a bigger image.
        const score = tier * 100 + (codeInUrl ? 0 : 30) + (w >= 600 ? 0 : 10);
        return {
          imageUrl: r.imageUrl,
          pageUrl: r.url ?? "",
          title: r.title ?? "",
          width: w,
          height: h,
          tier,
          tierLabel: label,
          codeInUrl,
          score,
        };
      })
      .sort((a, b) => a.score - b.score);

    results[p.sku] = { name: p.name, sku: p.sku, candidates };

    const best = candidates[0];
    console.log(
      `  ${best ? (best.codeInUrl ? "✓" : "?") : "×"} ${p.sku.padEnd(13)}${p.name.slice(0, 46).padEnd(48)}${
        best ? `${best.tierLabel}${best.codeInUrl ? " code-match" : ""}` : "no candidates"
      }`,
    );

    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
  }

  const withCandidates = Object.values(results).filter((r) => r.candidates.length > 0).length;
  console.log(`\n  candidates found for ${withCandidates} of ${missing.length}`);
  console.log(`  written to ${OUT} — review before applying\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
