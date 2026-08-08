import "dotenv/config";
/**
 * Build a local index of Vissco's own product catalog, so product images can be
 * matched to our SKUs offline.
 *
 *   npm run fetch-vissco-index
 *
 * Writes data/reference/vissco-connect-index.json. Vissco runs WooCommerce, whose Store
 * API is public and returns name, SKU and image URLs — far more reliable than
 * guessing image filenames, which is what the demo did (and those URLs are now
 * dead, because visscocore.com no longer resolves).
 *
 * This only reads a public product listing. Images are downloaded to our own
 * Cloudinary later by upload-images, never hotlinked.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://connect.vissco.com/wp-json/wc/store/v1/products";
const PER_PAGE = 100;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

export type VisscoProduct = {
  id: number;
  name: string;
  sku: string;
  permalink: string;
  image: string | null;
  categories: string[];
};

type ApiProduct = {
  id: number;
  name: string;
  sku: string;
  permalink: string;
  images?: { src?: string }[];
  categories?: { name?: string }[];
};

async function fetchPage(page: number): Promise<ApiProduct[]> {
  const res = await fetch(`${BASE}?per_page=${PER_PAGE}&page=${page}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`page ${page}: HTTP ${res.status}`);
  return (await res.json()) as ApiProduct[];
}

async function main() {
  const all: VisscoProduct[] = [];

  for (let page = 1; page <= 60; page += 1) {
    let batch: ApiProduct[];
    try {
      batch = await fetchPage(page);
    } catch (err) {
      console.log(`  stopped at page ${page}: ${err instanceof Error ? err.message : err}`);
      break;
    }

    if (batch.length === 0) break;

    for (const p of batch) {
      all.push({
        id: p.id,
        name: p.name,
        sku: p.sku ?? "",
        permalink: p.permalink,
        image: p.images?.[0]?.src ?? null,
        categories: (p.categories ?? []).map((c) => c.name ?? "").filter(Boolean),
      });
    }

    process.stdout.write(`\r  fetched ${all.length} products…`);
    // Be a considerate client rather than hammering someone else's server.
    await new Promise((r) => setTimeout(r, 400));

    if (batch.length < PER_PAGE) break;
  }

  console.log("");

  const withImage = all.filter((p) => p.image);
  const withSku = all.filter((p) => p.sku.trim());

  const dir = path.resolve(process.cwd(), "data/reference");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "vissco-connect-index.json");
  writeFileSync(out, `${JSON.stringify({ fetchedAt: new Date().toISOString(), products: all }, null, 2)}\n`);

  console.log(`\n  ${all.length} total, ${withImage.length} with an image, ${withSku.length} with a SKU`);
  console.log(`  written to ${path.relative(process.cwd(), out)}\n`);

  for (const p of withImage.slice(0, 5)) {
    console.log(`   ${p.sku || "(no sku)"} — ${p.name}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
