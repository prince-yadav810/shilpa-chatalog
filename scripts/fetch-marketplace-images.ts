import "dotenv/config";
/**
 * Find images (and, where missing, a price) for products the brands' own sites
 * didn't cover, using 1mg's public search.
 *
 *   npm run marketplace-images -- --dry-run
 *   npm run marketplace-images -- --dry-run --file vissco-osg.json
 *   npm run marketplace-images
 *
 * Sourcing order is unchanged: the brand's own site first (already done by
 * match-vissco-images / match-shopify-images), a marketplace second.
 *
 * Every candidate goes through src/lib/product-match.ts before it is accepted.
 * 1mg's search is loose enough to return a competitor's product for a Vissco
 * query, so the brand and every distinguishing word have to line up. Anything
 * that doesn't is left without an image and reported.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { isSameProduct, stripImageTransforms } from "../src/lib/product-match";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;
const limit = args.includes("--limit")
  ? Number.parseInt(args[args.indexOf("--limit") + 1], 10)
  : Infinity;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

const CACHE_PATH = path.resolve(process.cwd(), "data/reference/1mg-cache.json");

type Candidate = {
  name: string;
  brand: string | null;
  price: number | null;
  image: string | null;
  url: string | null;
};

type Row = {
  sku: string;
  name: string;
  brand?: string | null;
  variant?: string | null;
  price?: number;
  imageUrl?: string | null;
  imageSource?: string | null;
  priceProvisional?: boolean;
  [k: string]: unknown;
};

// ---------- cache ----------

let cache: Record<string, Candidate[]> = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    cache = {};
  }
}

function saveCache() {
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

// ---------- 1mg ----------

async function search(query: string): Promise<Candidate[]> {
  if (cache[query]) return cache[query];

  const url = `https://www.1mg.com/pharmacy_api_webservices/search-all?name=${encodeURIComponent(
    query,
  )}&city=Mumbai&per_page=10`;

  let candidates: Candidate[] = [];
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.ok) {
      const body = (await res.json()) as {
        results?: { value?: { data?: Record<string, unknown>[] } }[];
      };
      const data = body.results?.[0]?.value?.data ?? [];
      candidates = data.map((d) => ({
        name: String(d.name ?? ""),
        brand:
          (d.brand_name as string) ??
          (d.manufacturer_name as string) ??
          (d.marketer_name as string) ??
          null,
        price: typeof d.price === "number" ? d.price : null,
        image: Array.isArray(d.cropped_image_urls)
          ? ((d.cropped_image_urls as string[])[0] ?? null)
          : null,
        url: (d.url as string) ?? null,
      }));
    }
  } catch {
    candidates = [];
  }

  cache[query] = candidates;
  // Considerate rate: this is someone else's server.
  await new Promise((r) => setTimeout(r, 1100));
  return candidates;
}

// ---------- main ----------

async function main() {
  const dir = path.resolve(process.cwd(), "data/catalog");
  const files = (only ? [only] : ["vissco-osg.json", "vissco-mobility.json", "lakme-pro-skin.json", "ponds-pro.json", "lakme-pro-non-colors.json"])
    .filter((f) => existsSync(path.join(dir, f)));

  let looked = 0;
  let found = 0;
  let priced = 0;
  const rejected: string[] = [];
  const nothing: string[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(readFileSync(filePath, "utf8")) as { products: Row[] };
    let changed = false;

    for (const row of data.products) {
      if (row.imageUrl) continue;
      if (looked >= limit) break;
      looked += 1;

      const bareCode = row.sku.replace(/^[A-Z]+-/i, "");
      const queries = [
        `${row.brand ?? ""} ${bareCode} ${row.name}`.trim(),
        `${row.name}`.trim(),
      ];

      let accepted: Candidate | null = null;
      let lastReason = "no results";

      for (const q of queries) {
        const candidates = await search(q);
        if (candidates.length === 0) continue;

        for (const c of candidates) {
          if (!c.image) continue;
          const verdict = isSameProduct({
            ourName: row.name,
            ourBrand: row.brand ?? null,
            ourSku: row.sku,
            ourVariant: row.variant ?? null,
            theirName: c.name,
            theirBrand: c.brand,
          });
          if (verdict.ok) {
            accepted = c;
            break;
          }
          lastReason = verdict.reason;
        }
        if (accepted) break;
      }

      if (accepted?.image) {
        row.imageUrl = stripImageTransforms(accepted.image);
        row.imageSource = "1mg";
        found += 1;
        changed = true;

        // Fill a missing price from the same verified listing.
        if (row.price == null && accepted.price != null) {
          row.price = accepted.price;
          row.priceProvisional = true;
          priced += 1;
        }

        console.log(`  ✓ ${row.sku} ${row.name}\n        -> ${accepted.name}`);
      } else if (lastReason === "no results") {
        nothing.push(`${row.sku} ${row.name}`);
      } else {
        rejected.push(`${row.sku} ${row.name}\n        best was rejected: ${lastReason}`);
      }
    }

    if (changed && !dryRun) {
      writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
    }
  }

  saveCache();

  console.log(`\n  looked up      : ${looked}`);
  console.log(`  images found   : ${found}`);
  console.log(`  prices filled  : ${priced}`);
  console.log(`  rejected match : ${rejected.length}`);
  console.log(`  no results     : ${nothing.length}`);

  if (rejected.length > 0) {
    console.log(`\n  Rejected (a candidate existed but wasn't the same product):`);
    for (const r of rejected.slice(0, 25)) console.log(`    ${r}`);
    if (rejected.length > 25) console.log(`    …and ${rejected.length - 25} more`);
  }

  console.log(
    dryRun
      ? "\n  Dry run — no files changed (search results were cached).\n"
      : "\n  Catalog files updated. Run upload-images next.\n",
  );
}

main().catch((err) => {
  saveCache();
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
