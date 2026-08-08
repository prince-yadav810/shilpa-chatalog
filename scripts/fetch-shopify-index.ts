import "dotenv/config";
/**
 * Harvest a Shopify storefront's public product feed into a local index.
 *
 *   npm run fetch-shopify-index -- www.lakmeindia.com lakme
 *
 * Writes data/reference/<name>-index.json.
 *
 * Shopify exposes /products.json on every storefront. Variant SKUs there are
 * the brand's own article codes — Lakme's variant SKU "27309" is the same
 * "BP CODE 27309" printed in the distributor PDF, which makes matching exact
 * rather than a guess.
 *
 * Only a public product listing is read. Images are copied to our own
 * Cloudinary afterwards by upload-images, never hotlinked.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

export type ShopifyEntry = {
  sku: string;
  title: string;
  variantTitle: string;
  image: string | null;
  handle: string;
};

type Variant = { sku?: string; title?: string; featured_image?: { src?: string } };
type Product = {
  title: string;
  handle: string;
  variants?: Variant[];
  images?: { src?: string }[];
};

async function main() {
  const [domain, name] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!domain || !name) {
    throw new Error("Usage: npm run fetch-shopify-index -- <domain> <index-name>");
  }

  const entries: ShopifyEntry[] = [];
  let page = 1;

  while (page <= 100) {
    const url = `https://${domain}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) {
      console.log(`  stopped at page ${page}: HTTP ${res.status}`);
      break;
    }

    const body = (await res.json()) as { products?: Product[] };
    const products = body.products ?? [];
    if (products.length === 0) break;

    for (const product of products) {
      const fallback = product.images?.[0]?.src ?? null;
      for (const variant of product.variants ?? []) {
        const sku = (variant.sku ?? "").trim();
        if (!sku) continue;
        entries.push({
          sku,
          title: product.title,
          variantTitle: variant.title ?? "",
          // A shade variant has its own photo; use it rather than the first
          // product image, which would show the wrong colour.
          image: variant.featured_image?.src ?? fallback,
          handle: product.handle,
        });
      }
    }

    process.stdout.write(`\r  page ${page} — ${entries.length} variants…`);
    await new Promise((r) => setTimeout(r, 400));
    page += 1;
  }

  console.log("");

  const dir = path.resolve(process.cwd(), "data/reference");
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${name}-index.json`);
  writeFileSync(
    out,
    `${JSON.stringify({ domain, fetchedAt: new Date().toISOString(), entries }, null, 2)}\n`,
  );

  const withImage = entries.filter((e) => e.image).length;
  console.log(`\n  ${entries.length} variants with a SKU, ${withImage} with an image`);
  console.log(`  written to ${path.relative(process.cwd(), out)}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
