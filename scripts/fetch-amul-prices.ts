import "dotenv/config";
/**
 * Attach prices to the Amul catalogue from BigBasket's Amul ice cream listing.
 *
 *   npm run amul-prices -- --dry-run
 *   npm run amul-prices
 *
 * The Amul catalogue is a range poster with no prices at all, so they have to
 * come from the web. BigBasket lists ~134 Amul ice creams across four pages,
 * which is four scrapes rather than one lookup per product.
 *
 * Scraped markdown looks like:
 *
 *   ### [Amul **Ice Cream - Choco Chips, Real Milk**](…)       1 L - Tub
 *   ₹218.00₹230.00        <- selling price, then MRP
 *
 * We take the **MRP** as our price and leave `mrp` unset, exactly as the Vissco
 * and Lakme files do: the shop sells at MRP, and setting both would render a
 * discount badge the shop never offered.
 *
 * Prices are marked `priceProvisional` — they are a marketplace's figure, not
 * Shilpa's, and the client confirms them in the admin panel.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { isSameProduct, packSizes } from "../src/lib/product-match";

const dryRun = process.argv.includes("--dry-run");
const SCRAPE_DIR = "/tmp/bb";
const CATALOG = "data/catalog/amul-ice-cream.json";

type Listing = { name: string; pack: string; price: number; mrp: number | null };

/**
 * Parse one scraped page. Product headings and prices alternate, so a heading
 * is held until the next price line completes it.
 */
function parsePage(md: string): Listing[] {
  const out: Listing[] = [];
  const lines = md.split("\n");
  let pending: { name: string; pack: string } | null = null;

  for (const line of lines) {
    const heading = line.match(/^###\s+\[(.+?)\]\(.*?\)\s*(.*)$/);
    if (heading) {
      // "Amul\ **Ice Cream - Choco Chips, Real Milk**" -> plain text
      const name = heading[1]
        .replace(/\\/g, "")
        .replace(/\*\*/g, "")
        .replace(/\s+/g, " ")
        .trim();
      pending = { name, pack: heading[2].trim() };
      continue;
    }

    const money = line.match(/₹([\d.,]+)(?:₹([\d.,]+))?/);
    if (money && pending) {
      const a = Number.parseFloat(money[1].replace(/,/g, ""));
      const b = money[2] ? Number.parseFloat(money[2].replace(/,/g, "")) : null;
      // Discount banners ("₹12 OFF") are not a product price.
      if (Number.isFinite(a) && !/OFF/i.test(line)) {
        out.push({ name: pending.name, pack: pending.pack, price: a, mrp: b });
        pending = null;
      }
    }
  }
  return out;
}

function main() {
  if (!existsSync(SCRAPE_DIR)) {
    throw new Error(
      `No scrapes in ${SCRAPE_DIR}. Scrape the four BigBasket pages first.`,
    );
  }

  const listings: Listing[] = [];
  for (const f of readdirSync(SCRAPE_DIR).filter((f) => f.endsWith(".md"))) {
    listings.push(...parsePage(readFileSync(path.join(SCRAPE_DIR, f), "utf8")));
  }
  console.log(`  ${listings.length} BigBasket listings parsed`);

  const catalogPath = path.resolve(process.cwd(), CATALOG);
  const data = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    products: Record<string, unknown>[];
  };

  let matched = 0;
  const unmatched: string[] = [];

  for (const row of data.products) {
    if (row.price != null) continue;

    const ourName = String(row.name);
    const ourVariant = row.variant ? String(row.variant) : null;

    let best: Listing | null = null;
    for (const l of listings) {
      // BigBasket's pack is a separate column ("1 L - Tub"), so fold it into
      // the title before matching or the pack-size rule can't see it.
      const theirName = `${l.name} ${l.pack}`;
      const verdict = isSameProduct({
        ourName,
        ourBrand: "Amul",
        ourVariant,
        theirName,
        theirBrand: "Amul",
      });
      if (!verdict.ok) continue;

      // Prefer a listing whose pack size we actually confirmed.
      const ourSizes = packSizes(`${ourName} ${ourVariant ?? ""}`);
      const theirSizes = packSizes(theirName);
      const sized = ourSizes.some((s) => theirSizes.includes(s));
      if (sized) {
        best = l;
        break;
      }
      best ??= l;
    }

    if (best) {
      // MRP where BigBasket gives one, else its selling price.
      row.price = best.mrp ?? best.price;
      row.priceProvisional = true;
      row.priceSource = "bigbasket.com";
      matched += 1;
      console.log(
        `  ✓ ₹${String(row.price).padEnd(6)} ${ourName} ${ourVariant ?? ""}\n        ← ${best.name} ${best.pack}`,
      );
    } else {
      unmatched.push(`${ourName} ${ourVariant ?? ""}`);
    }
  }

  if (!dryRun) writeFileSync(catalogPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(`\n  priced   : ${matched}`);
  console.log(`  no match : ${unmatched.length}`);
  if (unmatched.length > 0) {
    for (const u of unmatched.slice(0, 30)) console.log(`     ${u}`);
    if (unmatched.length > 30) console.log(`     …and ${unmatched.length - 30} more`);
  }
  console.log(dryRun ? "\n  Dry run — file unchanged.\n" : "\n  Catalog updated.\n");
}

main();
