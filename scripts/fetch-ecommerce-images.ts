import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { isSameProduct, stripImageTransforms } from "../src/lib/product-match";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

const SHOPIFY_DOMAINS: Record<string, string> = {
  Lakme: "www.lakmeindia.com",
  "Pond's": "ponds.in",
  Simple: "simpleskincare.in",
  Vissco: "vissconext.com",
  Dove: "www.dove-india.com",
  Novology: "www.novology.com",
};

type Row = {
  sku: string;
  name: string;
  brand?: string | null;
  variant?: string | null;
  price?: number;
  imageUrl?: string | null;
  imageSource?: string | null;
  [key: string]: unknown;
};

// 1. Shopify search suggest API
async function searchShopify(domain: string, query: string) {
  const url = `https://${domain}/search/suggest.json?q=${encodeURIComponent(
    query,
  )}&resources[type]=product`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      const prods = data.resources?.results?.products ?? [];
      return prods.map((p: any) => ({
        title: String(p.title || ""),
        brand: null,
        image: p.image || p.featured_image?.url || null,
        source: domain,
      }));
    }
  } catch {}
  return [];
}

// 2. 1mg Pharmacy API
async function search1mg(query: string) {
  const url = `https://www.1mg.com/pharmacy_api_webservices/search-all?name=${encodeURIComponent(
    query,
  )}&city=Mumbai&per_page=10`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.ok) {
      const body = (await res.json()) as any;
      const data = body.results?.[0]?.value?.data ?? [];
      return data.map((d: any) => ({
        title: String(d.name || ""),
        brand:
          (d.brand_name as string) ??
          (d.manufacturer_name as string) ??
          (d.marketer_name as string) ??
          null,
        image: Array.isArray(d.cropped_image_urls)
          ? d.cropped_image_urls[0] ?? null
          : null,
        source: "1mg",
      }));
    }
  } catch {}
  return [];
}

// 3. DuckDuckGo Image Search API for Indian E-Commerce listings
async function searchDDGImages(query: string) {
  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const res1 = await fetch(tokenUrl, { headers: { "User-Agent": UA } });
    const text = await res1.text();
    const vqdMatch = text.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];

    const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(
      query,
    )}&o=json&vqd=${vqd}`;
    const res2 = await fetch(imgUrl, { headers: { "User-Agent": UA } });
    if (res2.ok) {
      const data = (await res2.json()) as any;
      return (data.results ?? []).map((r: any) => ({
        title: String(r.title ?? ""),
        image: r.image ?? null,
        source: r.provider || "ecommerce",
      }));
    }
  } catch {}
  return [];
}

function generateSearchQueries(row: Row): string[] {
  const brand = row.brand ?? "";
  const bareCode = row.sku.replace(/^[A-Z]+-/i, "").trim();
  const name = row.name.trim();

  const queries = new Set<string>();

  // 1. Bare code if numeric or specific code
  if (/^\d{3,5}$/.test(bareCode) || /^\d{4}/.test(bareCode)) {
    queries.add(`${brand} ${bareCode}`);
    queries.add(bareCode);
  }

  // 2. Full product name
  queries.add(`${brand} ${name}`);
  queries.add(name);

  // 3. Simplified name without extra filler words
  const simplified = name
    .replace(/\b(Pro|Brilliance|Complex|Super|Ultra|Soft|Insta)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (simplified !== name) {
    queries.add(`${brand} ${simplified}`);
  }

  return [...queries];
}

async function main() {
  const catalogDir = path.resolve(process.cwd(), "data/catalog");
  const files = readdirSync(catalogDir).filter(
    (f) => f.endsWith(".json") && f !== "EXAMPLE.json",
  );

  let totalLooked = 0;
  let totalMatched = 0;

  console.log(`\nScanning catalog files for missing images...\n`);

  for (const file of files) {
    const filePath = path.join(catalogDir, file);
    const data = JSON.parse(readFileSync(filePath, "utf8")) as {
      products: Row[];
    };
    let fileChanged = false;

    for (const row of data.products) {
      if (row.imageUrl) continue;
      totalLooked += 1;

      const brand = row.brand ?? "";
      const queries = generateSearchQueries(row);
      let match: { title: string; image: string; source: string } | null = null;

      // Stage A: Brand Official Shopify Store
      const shopifyDomain = SHOPIFY_DOMAINS[brand];
      if (shopifyDomain) {
        for (const q of queries) {
          const candidates = await searchShopify(shopifyDomain, q);
          for (const c of candidates) {
            if (!c.image) continue;
            const verdict = isSameProduct({
              ourName: row.name,
              ourBrand: brand,
              ourSku: row.sku,
              ourVariant: row.variant ?? null,
              theirName: c.title,
              // The store is single-brand, so its own brand is implied even
              // when the product title omits it.
              theirBrand: brand,
              // Deliberately NOT codeMatched. These candidates come from a
              // *name* search (/search/suggest.json?q=), not an article-code
              // lookup. Passing codeMatched skips the "every distinguishing
              // word must appear" rule — the rule that stops "Peach Milk Soft
              // Creme" being satisfied by "Peach Milk Vit E Creme".
            });
            if (verdict.ok) {
              match = {
                title: c.title,
                image: c.image,
                source: shopifyDomain,
              };
              break;
            }
          }
          if (match) break;
        }
      }

      // Stage B: 1mg Marketplace
      if (!match) {
        for (const q of queries) {
          const candidates = await search1mg(q);
          for (const c of candidates) {
            if (!c.image) continue;
            const verdict = isSameProduct({
              ourName: row.name,
              ourBrand: brand,
              ourSku: row.sku,
              ourVariant: row.variant ?? null,
              theirName: c.title,
              theirBrand: c.brand,
            });
            if (verdict.ok) {
              match = {
                title: c.title,
                image: stripImageTransforms(c.image),
                source: "1mg",
              };
              break;
            }
          }
          if (match) break;
        }
      }

      // Stage C: E-Commerce Search (BigBasket, Nykaa, Tirabeauty, Amazon, Flipkart, Netmeds)
      if (!match) {
        const ddgQuery = `${brand} ${row.name} buy online india product image`.trim();
        const ddgCandidates = await searchDDGImages(ddgQuery);
        for (const c of ddgCandidates) {
          if (!c.image) continue;
          if (!c.image.startsWith("http")) continue;
          if (c.image.includes("logo") || c.image.includes("banner")) continue;

          const verdict = isSameProduct({
            ourName: row.name,
            ourBrand: brand,
            ourSku: row.sku,
            ourVariant: row.variant ?? null,
            theirName: c.title,
            theirBrand: brand,
          });
          if (verdict.ok) {
            match = {
              title: c.title,
              image: c.image,
              source: c.source || "ecommerce-search",
            };
            break;
          }
        }
      }

      if (match) {
        row.imageUrl = match.image;
        row.imageSource = match.source;
        totalMatched += 1;
        fileChanged = true;
        console.log(
          `  ✓ [${row.sku}] ${row.name}\n        -> ${match.title} (${match.source})`,
        );
      } else {
        console.log(`  ✗ [${row.sku}] ${row.name} (no verifiable match found)`);
      }
    }

    if (fileChanged && !dryRun) {
      writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
    }
  }

  console.log(`\n----------------------------------------`);
  console.log(`Total missing scanned : ${totalLooked}`);
  console.log(`Images found & matched : ${totalMatched}`);
  console.log(`Remaining without image: ${totalLooked - totalMatched}`);
  console.log(`----------------------------------------\n`);

  if (dryRun) {
    console.log(`Dry run complete — no catalog files changed.\n`);
  } else {
    console.log(`Catalog files updated successfully.\n`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
