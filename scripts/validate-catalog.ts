import "dotenv/config";
/**
 * Check an extracted catalog file before it goes anywhere near the database.
 *
 *   npm run validate-catalog                          # every file
 *   npm run validate-catalog -- data/catalog/x.json   # one file
 *
 * The import script's schema check only proves the shape is right. This looks
 * for the mistakes an extraction actually makes: a price misread by a factor of
 * ten, the same product code used twice, a subcategory spelled two ways so it
 * splits into two sections on the website.
 *
 * Errors block an import. Warnings are for a human to glance at.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { catalogFileSchema, type CatalogRow } from "../src/lib/catalog-file";

const CATALOG_DIR = path.resolve(process.cwd(), "data/catalog");

type Finding = { level: "error" | "warn"; message: string };

/** Prices outside this range are almost always a decimal or OCR slip. */
const MIN_SENSIBLE_PRICE = 10;
const MAX_SENSIBLE_PRICE = 200_000;

function checkFile(file: string, seenGlobally: Map<string, string>): Finding[] {
  const findings: Finding[] = [];
  const raw = readFileSync(path.join(CATALOG_DIR, file), "utf8");

  let parsed;
  try {
    parsed = catalogFileSchema.safeParse(JSON.parse(raw));
  } catch (err) {
    return [
      {
        level: "error",
        message: `not valid JSON — ${err instanceof Error ? err.message : err}`,
      },
    ];
  }

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.push({
        level: "error",
        message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      });
    }
    return findings;
  }

  const { products } = parsed.data;

  // --- SKUs ---
  const skuCounts = new Map<string, number>();
  for (const row of products) {
    skuCounts.set(row.sku, (skuCounts.get(row.sku) ?? 0) + 1);
  }
  for (const [sku, count] of skuCounts) {
    if (count > 1) {
      findings.push({
        level: "error",
        message: `SKU "${sku}" appears ${count} times — each row needs its own code`,
      });
    }
    const owner = seenGlobally.get(sku);
    if (owner && owner !== file) {
      findings.push({
        level: "error",
        message: `SKU "${sku}" is already used in ${owner}`,
      });
    }
    seenGlobally.set(sku, file);

    /*
     * Also compare the bare article code, ignoring the brand prefix. Two
     * suppliers' PDFs can list the same product, and "LKM-27714" vs
     * "SMP-27714" are different strings but the same tube on the shelf —
     * which would ship as two separate products on the storefront.
     */
    const bare = sku.replace(/^[A-Z]+-/i, "").toUpperCase();
    const bareOwner = seenGlobally.get(`bare:${bare}`);
    if (bareOwner && bareOwner !== file) {
      findings.push({
        level: "error",
        message: `product code ${bare} ("${sku}") also appears in ${bareOwner} — same product listed twice`,
      });
    }
    seenGlobally.set(`bare:${bare}`, file);
  }

  // --- category tree consistency ---
  // The same subcategory name under two different parents would produce two
  // separate sections on the site that look identical to a customer.
  const parentOf = new Map<string, Set<string>>();
  for (const row of products) {
    const key = row.subcategory.trim().toLowerCase();
    (parentOf.get(key) ?? parentOf.set(key, new Set()).get(key)!).add(
      row.category.trim(),
    );
  }
  for (const [sub, parents] of parentOf) {
    if (parents.size > 1) {
      findings.push({
        level: "error",
        message: `subcategory "${sub}" is filed under ${[...parents]
          .map((p) => `"${p}"`)
          .join(" and ")} — pick one`,
      });
    }
  }

  // Near-identical spellings that would split one section into two.
  // "&" and "and" have to collapse together, or "Knee & Calf" and
  // "Knee and Calf" read as unrelated and quietly become two sections.
  const canon = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]/g, "");
  const byCanon = new Map<string, Set<string>>();
  for (const row of products) {
    for (const name of [row.category, row.subcategory]) {
      const key = canon(name);
      (byCanon.get(key) ?? byCanon.set(key, new Set()).get(key)!).add(name);
    }
  }
  for (const variants of byCanon.values()) {
    if (variants.size > 1) {
      findings.push({
        level: "error",
        message: `these differ only in spacing or punctuation and would become separate sections: ${[
          ...variants,
        ]
          .map((v) => `"${v}"`)
          .join(", ")}`,
      });
    }
  }

  // Brand spelled inconsistently.
  const brandByCanon = new Map<string, Set<string>>();
  for (const row of products) {
    if (!row.brand) continue;
    const key = canon(row.brand);
    (brandByCanon.get(key) ?? brandByCanon.set(key, new Set()).get(key)!).add(row.brand);
  }
  for (const variants of brandByCanon.values()) {
    if (variants.size > 1) {
      findings.push({
        level: "error",
        message: `brand spelled inconsistently: ${[...variants].map((v) => `"${v}"`).join(", ")}`,
      });
    }
  }

  // --- per-row checks ---
  for (const row of products) {
    const where = `${row.sku} (${row.name})`;

    // A row may legitimately have no price yet (see catalog-file.ts).
    if (row.price == null) {
      findings.push({
        level: "warn",
        message: `${where}: no price yet — will not import until one is set`,
      });
    } else if (row.price < MIN_SENSIBLE_PRICE) {
      findings.push({
        level: "error",
        message: `${where}: ₹${row.price} looks like a misread — check the printed MRP`,
      });
    }
    if (row.price != null && row.price > MAX_SENSIBLE_PRICE) {
      findings.push({
        level: "error",
        message: `${where}: ₹${row.price} looks like a misread — check for a stray digit`,
      });
    }
    if (row.mrp != null && row.price != null && row.mrp <= row.price) {
      findings.push({
        level: "error",
        message: `${where}: mrp ₹${row.mrp} is not above price ₹${row.price} — omit mrp instead`,
      });
    }
    if (row.imageUrl && !row.imageUrl.includes("res.cloudinary.com")) {
      findings.push({
        level: "warn",
        message: `${where}: image is not on Cloudinary yet — run upload-images first`,
      });
    }
    if (!row.variant) {
      findings.push({
        level: "warn",
        message: `${where}: no pack size or size run recorded`,
      });
    }
    if (row.brand && !row.name.toLowerCase().startsWith(row.brand.toLowerCase())) {
      findings.push({
        level: "warn",
        message: `${where}: name doesn't start with the brand "${row.brand}"`,
      });
    }
    if (/\s{2,}/.test(row.name)) {
      findings.push({ level: "warn", message: `${where}: double space in the name` });
    }
  }

  // --- price outliers within a subcategory ---
  // A ₹40 item among ₹400 ones is usually a dropped digit.
  const bySub = new Map<string, CatalogRow[]>();
  for (const row of products) {
    (bySub.get(row.subcategory) ?? bySub.set(row.subcategory, []).get(row.subcategory)!).push(row);
  }
  for (const [sub, rows] of bySub) {
    if (rows.length < 5) continue;
    const withPrice = rows.filter(
      (r): r is typeof r & { price: number } => r.price != null,
    );
    if (withPrice.length < 5) continue;
    const sorted = [...withPrice].sort((a, b) => a.price - b.price);
    const median = sorted[Math.floor(sorted.length / 2)].price;
    for (const row of withPrice) {
      if (row.price < median / 10 || row.price > median * 10) {
        findings.push({
          level: "warn",
          message: `${row.sku}: ₹${row.price} is far from the ₹${median} median for "${sub}" — worth a second look`,
        });
      }
    }
  }

  return findings;
}

function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const files = arg
    ? [path.basename(arg)]
    : readdirSync(CATALOG_DIR).filter(
        (f) => f.endsWith(".json") && f !== "EXAMPLE.json",
      );

  if (files.length === 0) {
    console.log("\nNo catalog files to check yet.\n");
    return;
  }

  const seenGlobally = new Map<string, string>();
  let errors = 0;
  let warnings = 0;

  for (const file of files) {
    const findings = checkFile(file, seenGlobally);
    const fileErrors = findings.filter((f) => f.level === "error");
    const fileWarnings = findings.filter((f) => f.level === "warn");
    errors += fileErrors.length;
    warnings += fileWarnings.length;

    let count = 0;
    try {
      count = JSON.parse(readFileSync(path.join(CATALOG_DIR, file), "utf8")).products
        ?.length ?? 0;
    } catch {
      /* already reported */
    }

    const verdict =
      fileErrors.length > 0 ? "FAILED" : fileWarnings.length > 0 ? "ok, with notes" : "clean";
    console.log(`\n${file} — ${count} products — ${verdict}`);

    for (const f of fileErrors) console.log(`   ERROR  ${f.message}`);
    for (const f of fileWarnings.slice(0, 25)) console.log(`   note   ${f.message}`);
    if (fileWarnings.length > 25) {
      console.log(`   note   …and ${fileWarnings.length - 25} more`);
    }
  }

  console.log(
    `\n${files.length} file(s): ${errors} error(s), ${warnings} note(s).\n`,
  );

  if (errors > 0) {
    console.log("Fix the errors before importing.\n");
    process.exitCode = 1;
  }
}

main();
