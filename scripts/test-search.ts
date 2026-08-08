import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { isSameProduct } from "../src/lib/product-match";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

type Row = {
  sku: string;
  name: string;
  brand?: string | null;
  variant?: string | null;
  price?: number;
  imageUrl?: string | null;
  imageSource?: string | null;
};

const CATALOG_DIR = path.resolve(process.cwd(), "data/catalog");
const files = readdirSync(CATALOG_DIR).filter(
  (f) => f.endsWith(".json") && f !== "EXAMPLE.json",
);

const missing: { row: Row; file: string }[] = [];
for (const file of files) {
  const content = JSON.parse(
    readFileSync(path.join(CATALOG_DIR, file), "utf8"),
  );
  for (const row of content.products) {
    if (!row.imageUrl) {
      missing.push({ row, file });
    }
  }
}

console.log(`Missing images total: ${missing.length}`);

// 1mg API Search
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
        title: String(d.name ?? ""),
        brand:
          (d.brand_name as string) ??
          (d.manufacturer_name as string) ??
          (d.marketer_name as string) ??
          null,
        price: typeof d.price === "number" ? d.price : null,
        image: Array.isArray(d.cropped_image_urls)
          ? d.cropped_image_urls[0] ?? null
          : null,
        source: "1mg",
      }));
    }
  } catch {}
  return [];
}

// DuckDuckGo Image Search API / scraper for high-res e-commerce product photos
async function searchDuckDuckGoImages(query: string) {
  try {
    // Token fetch
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const res1 = await fetch(tokenUrl, { headers: { "User-Agent": UA } });
    const text = await res1.text();
    const vqdMatch = text.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];

    // Image API
    const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(
      query,
    )}&o=json&vqd=${vqd}`;
    const res2 = await fetch(imgUrl, { headers: { "User-Agent": UA } });
    if (res2.ok) {
      const data = (await res2.json()) as any;
      return (data.results ?? []).map((r: any) => ({
        title: String(r.title ?? ""),
        image: r.image ?? null,
        source: r.provider || "duckduckgo",
      }));
    }
  } catch {}
  return [];
}

async function run() {
  let matched1mg = 0;
  let matchedDDG = 0;

  for (const { row, file } of missing) {
    const brand = row.brand ?? "";
    const bareCode = row.sku.replace(/^[A-Z]+-/i, "");

    // Search 1mg with clean queries
    const queries = [
      `${brand} ${row.name}`.trim(),
      `${brand} ${bareCode} ${row.name}`.trim(),
      row.name.trim(),
    ];

    let found = false;
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
          console.log(
            `✓ [1mg] ${row.sku} (${row.name}) -> ${c.title} | ${c.image}`,
          );
          matched1mg++;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      // Try DuckDuckGo image search as fallback
      const ddgQuery = `${brand} ${row.name} buy online india product image`.trim();
      const ddgCandidates = await searchDuckDuckGoImages(ddgQuery);
      for (const c of ddgCandidates) {
        if (!c.image) continue;
        const verdict = isSameProduct({
          ourName: row.name,
          ourBrand: brand,
          ourSku: row.sku,
          ourVariant: row.variant ?? null,
          theirName: c.title,
          theirBrand: brand,
        });
        if (verdict.ok) {
          console.log(
            `✓ [DDG] ${row.sku} (${row.name}) -> ${c.title} | ${c.image}`,
          );
          matchedDDG++;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      console.log(`✗ [NO MATCH] ${row.sku} (${row.name})`);
    }
  }

  console.log(
    `\nSummary: 1mg matched ${matched1mg}, DDG matched ${matchedDDG}, Total missing: ${missing.length}`,
  );
}

run();
