import "dotenv/config";
/**
 * Attach Vissco product images to our catalog rows.
 *
 *   npm run match-vissco-images -- --dry-run
 *   npm run match-vissco-images
 *
 * Two passes:
 *   1. Exact product code — our "PC-0301A" against their "0301A".
 *   2. Name similarity, for rows whose code doesn't match. The priced PDF and
 *      the website don't always use the same code: our PC-0645 "Dynamic
 *      Cock-up" is their 0625 "DYNAMIC COCK UP SPLINT".
 *
 * Pass 2 is deliberately strict. A wrong product photo is worse than no photo —
 * a customer orders the thing in the picture. Anything below the confidence
 * threshold is left without an image and listed for a human to decide.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { VisscoProduct } from "./fetch-vissco-index";

const dryRun = process.argv.includes("--dry-run");

const CATALOG_FILES = ["vissco-osg.json", "vissco-mobility.json"];

/** Words that carry no distinguishing meaning in an orthopaedic catalog. */
const STOPWORDS = new Set([
  "vissco", "the", "with", "and", "for", "a", "of", "type",
  "support", "supports", "splint", "brace", "belt", "series",
]);

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&#\d+;/g, " ") // HTML entities in their titles
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Dice coefficient over meaningful tokens.
 *
 * On its own this is not enough: "Superio Wheelchair with Removable Big Wheels"
 * and "Imperio Wheelchair with Removable Big Wheels" score 0.73 because the
 * shared boilerplate drowns out the one token that actually identifies the
 * product. See `distinctiveConflict`.
 */
function similarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;

  return (2 * shared) / (ta.size + tb.size);
}

/**
 * Token frequency across the whole reference index. A token appearing in only a
 * handful of product names is a model name ("superio", "abdoset") or a defining
 * feature ("donut", "hinged") — exactly the words that must not differ.
 */
function buildDocFreq(names: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const name of names) {
    for (const t of new Set(tokens(name))) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  return df;
}

const RARE_MAX_DF = 40;

/**
 * True when one name carries a distinctive token the other lacks.
 *
 * This is what stops "3D Knee Cap with Donut Padding" from being given the
 * plain "3D Knee Cap" photo, and "Deluxe Wheelchair" from being given the
 * "Imperio Wheelchair" one.
 */
function distinctiveConflict(
  a: string,
  b: string,
  df: Map<string, number>,
): string | null {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));

  for (const t of ta) {
    if (tb.has(t)) continue;
    if ((df.get(t) ?? 0) <= RARE_MAX_DF) return t;
  }
  for (const t of tb) {
    if (ta.has(t)) continue;
    if ((df.get(t) ?? 0) <= RARE_MAX_DF) return t;
  }
  return null;
}

/**
 * Numbers in a name are usually sizes ("19", "10") and mismatching them means
 * mismatching the product. Treat a numeric conflict as disqualifying.
 */
function numbersConflict(a: string, b: string): boolean {
  const na = new Set((a.match(/\d+/g) ?? []).filter((n) => n.length <= 2));
  const nb = new Set((b.match(/\d+/g) ?? []).filter((n) => n.length <= 2));
  if (na.size === 0 || nb.size === 0) return false;
  for (const n of na) if (nb.has(n)) return false;
  return true;
}

const CONFIDENT = 0.72;
const REVIEW_FLOOR = 0.5;

type Row = {
  sku: string;
  name: string;
  imageUrl?: string | null;
  [k: string]: unknown;
};

function main() {
  const indexPath = path.resolve(process.cwd(), "data/reference/vissco-index.json");
  const index: VisscoProduct[] = JSON.parse(readFileSync(indexPath, "utf8")).products;
  const withImage = index.filter((p) => p.image);

  const docFreq = buildDocFreq(withImage.map((p) => p.name));

  const bySku = new Map<string, VisscoProduct>();
  for (const p of withImage) {
    const key = String(p.sku ?? "").trim().toUpperCase();
    if (key) bySku.set(key, p);
  }

  let exact = 0;
  let fuzzy = 0;
  let already = 0;
  const accepted: string[] = [];
  const review: string[] = [];
  const unmatched: string[] = [];

  for (const file of CATALOG_FILES) {
    const filePath = path.resolve(process.cwd(), "data/catalog", file);
    const data = JSON.parse(readFileSync(filePath, "utf8")) as { products: Row[] };

    for (const row of data.products) {
      if (row.imageUrl) {
        already += 1;
        continue;
      }

      const code = row.sku.replace(/^PC-/i, "").toUpperCase();
      const hit = bySku.get(code) ?? bySku.get(code.replace(/[A-Z]$/, ""));

      if (hit?.image) {
        row.imageUrl = hit.image;
        exact += 1;
        continue;
      }

      // Pass 2: best name match.
      let best: VisscoProduct | null = null;
      let bestScore = 0;
      let runnerUp = 0;

      for (const candidate of withImage) {
        const score = similarity(row.name, candidate.name);
        if (score > bestScore) {
          runnerUp = bestScore;
          bestScore = score;
          best = candidate;
        } else if (score > runnerUp) {
          runnerUp = score;
        }
      }

      const ambiguous = bestScore - runnerUp < 0.08;
      const conflicted = best ? numbersConflict(row.name, best.name) : false;
      const distinctive = best ? distinctiveConflict(row.name, best.name, docFreq) : null;

      if (best?.image && bestScore >= CONFIDENT && !ambiguous && !conflicted && !distinctive) {
        row.imageUrl = best.image;
        fuzzy += 1;
        accepted.push(
          `${bestScore.toFixed(2)}  ${row.sku} "${row.name}"\n           -> "${best.name}"`,
        );
      } else if (best && bestScore >= REVIEW_FLOOR) {
        review.push(
          `${row.sku} "${row.name}"\n      maybe: "${best.name}" (${bestScore.toFixed(2)}${
            ambiguous ? ", ambiguous" : ""
          }${conflicted ? ", size mismatch" : ""}${
            distinctive ? `, differs on "${distinctive}"` : ""
          })\n      ${best.image}`,
        );
      } else {
        unmatched.push(`${row.sku} "${row.name}"`);
      }
    }

    if (!dryRun) {
      writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
    }
  }

  const total = exact + fuzzy;
  console.log(`\n  exact code match : ${exact}`);
  console.log(`  name match       : ${fuzzy}`);
  console.log(`  already had one  : ${already}`);
  console.log(`  needs a human    : ${review.length}`);
  console.log(`  no candidate     : ${unmatched.length}`);
  console.log(`  ---`);
  console.log(`  images attached  : ${total}`);

  if (accepted.length > 0) {
    console.log(`\n  Matched by name (no shared product code):\n`);
    for (const a of accepted) console.log(`    ${a}`);
  }

  if (review.length > 0) {
    console.log(`\n  Close but not certain — check these by eye:\n`);
    for (const r of review) console.log(`    ${r}\n`);
  }

  if (unmatched.length > 0) {
    console.log(`  No usable candidate on their site:`);
    for (const u of unmatched.slice(0, 30)) console.log(`    ${u}`);
    if (unmatched.length > 30) console.log(`    …and ${unmatched.length - 30} more`);
  }

  console.log(
    dryRun
      ? "\n  Dry run — no files changed.\n"
      : "\n  Catalog files updated. Run upload-images next to copy them to Cloudinary.\n",
  );
}

main();
