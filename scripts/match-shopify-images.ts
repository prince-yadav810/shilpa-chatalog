import "dotenv/config";
/**
 * Attach images to the cosmetics catalogs from the brands' own Shopify stores.
 *
 *   npm run match-shopify-images -- --dry-run
 *   npm run match-shopify-images
 *
 * Matching is by article code only. Lakme's Shopify variant SKU "27309" is the
 * same "BP CODE 27309" printed in the distributor PDF, so this is an identity
 * match rather than a guess.
 *
 * Name matching is deliberately NOT done here. Cosmetics differ by shade and
 * pack size in ways a token score can't see — "Peach Milk Soft Creme 50g" and
 * "…150g" score near-identical, and a wrong shade photo is a customer ordering
 * the wrong lipstick. Unmatched rows stay imageless and get listed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ShopifyEntry } from "./fetch-shopify-index";

const dryRun = process.argv.includes("--dry-run");

const INDEXES = ["lakme", "ponds", "simple"];
const CATALOG_FILES = ["lakme-pro-skin.json", "ponds-pro.json", "lakme-pro-non-colors.json"];

type Row = {
  sku: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  [k: string]: unknown;
};

function main() {
  const bySku = new Map<string, ShopifyEntry>();

  for (const name of INDEXES) {
    const p = path.resolve(process.cwd(), `data/reference/${name}-index.json`);
    if (!existsSync(p)) {
      console.log(`  (no ${name} index — run fetch-shopify-index first)`);
      continue;
    }
    const entries: ShopifyEntry[] = JSON.parse(readFileSync(p, "utf8")).entries;
    for (const e of entries) {
      const key = e.sku.trim().toUpperCase();
      // First index wins, so an earlier brand's own store beats a later one.
      if (e.image && key && !bySku.has(key)) bySku.set(key, e);
    }
  }

  console.log(`  reference codes available: ${bySku.size}`);

  let matched = 0;
  let already = 0;
  const missingByBrand = new Map<string, string[]>();

  for (const file of CATALOG_FILES) {
    const filePath = path.resolve(process.cwd(), "data/catalog", file);
    const data = JSON.parse(readFileSync(filePath, "utf8")) as { products: Row[] };

    for (const row of data.products) {
      if (row.imageUrl) {
        already += 1;
        continue;
      }

      const code = row.sku.replace(/^[A-Z]+-/i, "").trim().toUpperCase();
      const hit = bySku.get(code);

      if (hit?.image) {
        row.imageUrl = hit.image;
        matched += 1;
      } else {
        const brand = row.brand ?? "(no brand)";
        const list = missingByBrand.get(brand) ?? [];
        list.push(`${row.sku} ${row.name}`);
        missingByBrand.set(brand, list);
      }
    }

    if (!dryRun) writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  console.log(`\n  matched by code : ${matched}`);
  console.log(`  already had one : ${already}`);

  const missingTotal = [...missingByBrand.values()].reduce((n, l) => n + l.length, 0);
  console.log(`  no image found  : ${missingTotal}\n`);

  for (const [brand, list] of [...missingByBrand].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${brand}: ${list.length} without an image`);
    for (const item of list.slice(0, 5)) console.log(`     ${item}`);
    if (list.length > 5) console.log(`     …and ${list.length - 5} more`);
  }

  console.log(
    dryRun
      ? "\n  Dry run — no files changed.\n"
      : "\n  Catalog files updated. Run upload-images next.\n",
  );
}

main();
