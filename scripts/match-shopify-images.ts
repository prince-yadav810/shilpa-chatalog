import "dotenv/config";
/**
 * Attach images from the brands' own Shopify stores.
 *
 *   npm run match-shopify-images -- --dry-run
 *   npm run match-shopify-images
 *
 * Preferred over the marketplace fallback: these are the manufacturers' own
 * listings, and their variant SKUs are the same article codes printed in the
 * distributor PDFs. Lakme's Shopify SKU "27309" is the "BP CODE 27309" in the
 * PDF, so most matching is identity rather than guesswork.
 *
 * Two code shapes are handled:
 *   - exact       — Lakme/Pond's "27309" against our "LKM-27309"
 *   - size-suffix — vissconext.com sells one code in several sizes as
 *                   "0759S", "0759STD", "0759SPL"; all are our "PC-0759"
 *
 * Every code hit is still verified through src/lib/product-match.ts. A code
 * table can be wrong, and the cost of a wrong photo is a customer ordering the
 * wrong thing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ShopifyEntry } from "./fetch-shopify-index";
import { isSameProduct } from "../src/lib/product-match";

const dryRun = process.argv.includes("--dry-run");

/**
 * Single-brand stores don't repeat the brand in product titles, so it's
 * recorded here and supplied to the matcher.
 */
const INDEXES: { name: string; brand: string; source: string }[] = [
  { name: "visscon", brand: "Vissco", source: "vissconext.com" },
  { name: "lakme", brand: "Lakme", source: "lakmeindia.com" },
  { name: "ponds", brand: "Pond's", source: "ponds.in" },
  { name: "simple", brand: "Simple", source: "simpleskincare.in" },
];

const CATALOG_FILES = [
  "vissco-osg.json",
  "vissco-mobility.json",
  "lakme-pro-skin.json",
  "ponds-pro.json",
  "lakme-pro-non-colors.json",
];

type Indexed = ShopifyEntry & { brand: string; source: string };

type Row = {
  sku: string;
  name: string;
  brand?: string | null;
  variant?: string | null;
  imageUrl?: string | null;
  imageSource?: string | null;
  [k: string]: unknown;
};

/** "0759STD" -> ["0759STD", "0759"] so a size-suffixed SKU still finds its code. */
function codeKeys(sku: string): string[] {
  const bare = sku.replace(/^[A-Z]+-/i, "").trim().toUpperCase();
  const keys = new Set<string>([bare]);
  const stem = bare.match(/^(\d{3,5}[A-Z]?)/)?.[1];
  if (stem) {
    keys.add(stem);
    keys.add(stem.replace(/[A-Z]$/, ""));
  }
  return [...keys];
}

function main() {
  const byCode = new Map<string, Indexed>();

  for (const idx of INDEXES) {
    const p = path.resolve(process.cwd(), `data/reference/${idx.name}-index.json`);
    if (!existsSync(p)) {
      console.log(`  (no ${idx.name} index — run fetch-shopify-index first)`);
      continue;
    }
    const entries: ShopifyEntry[] = JSON.parse(readFileSync(p, "utf8")).entries;
    for (const e of entries) {
      if (!e.image) continue;
      for (const key of codeKeys(e.sku)) {
        // Earlier indexes win, so a brand's own store beats a later one.
        if (key && !byCode.has(key)) {
          byCode.set(key, { ...e, brand: idx.brand, source: idx.source });
        }
      }
    }
  }

  console.log(`  reference codes available: ${byCode.size}`);

  let matched = 0;
  let already = 0;
  const rejected: string[] = [];
  const missingByBrand = new Map<string, number>();

  for (const file of CATALOG_FILES) {
    const filePath = path.resolve(process.cwd(), "data/catalog", file);
    if (!existsSync(filePath)) continue;

    const data = JSON.parse(readFileSync(filePath, "utf8")) as { products: Row[] };
    let changed = false;

    for (const row of data.products) {
      if (row.imageUrl) {
        already += 1;
        continue;
      }

      let hit: Indexed | undefined;
      for (const key of codeKeys(row.sku)) {
        hit = byCode.get(key);
        if (hit) break;
      }

      if (hit?.image) {
        const verdict = isSameProduct({
          ourName: row.name,
          ourBrand: row.brand ?? null,
          ourSku: row.sku,
          ourVariant: row.variant ?? null,
          theirName: hit.title,
          theirBrand: hit.brand,
          codeMatched: true,
        });

        if (verdict.ok) {
          row.imageUrl = hit.image;
          row.imageSource = hit.source;
          matched += 1;
          changed = true;
          continue;
        }

        rejected.push(
          `${row.sku} "${row.name}"\n        code hit "${hit.title.slice(0, 70)}" rejected: ${verdict.reason}`,
        );
        continue;
      }

      const brand = row.brand ?? "(no brand)";
      missingByBrand.set(brand, (missingByBrand.get(brand) ?? 0) + 1);
    }

    if (changed && !dryRun) writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  console.log(`\n  matched by code : ${matched}`);
  console.log(`  already had one : ${already}`);
  console.log(`  code hit rejected: ${rejected.length}`);

  const missingTotal = [...missingByBrand.values()].reduce((a, b) => a + b, 0);
  console.log(`  no code found   : ${missingTotal}\n`);

  if (rejected.length > 0) {
    console.log(`  Code matched but the product didn't — check these:\n`);
    for (const r of rejected.slice(0, 20)) console.log(`    ${r}`);
    if (rejected.length > 20) console.log(`    …and ${rejected.length - 20} more\n`);
  }

  for (const [brand, n] of [...missingByBrand].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${brand}: ${n} still without an image`);
  }

  console.log(
    dryRun
      ? "\n  Dry run — no files changed.\n"
      : "\n  Catalog files updated. Run upload-images next.\n",
  );
}

main();
