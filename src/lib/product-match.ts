/**
 * Decides whether a marketplace search result is really the product we asked
 * for.
 *
 * This exists because marketplace search is fuzzy in a way that is actively
 * dangerous for a shop catalog. Real results observed from 1mg:
 *
 *   "Dove Beauty Moisture Face Wash"  -> "Aquahance Moisture Surge Face Wash"
 *   "Vissco Wrist Brace with Thumb"   -> "Tynor E-06 Wrist Brace with Thumb"
 *   "Lakme Peach Milk Soft Creme"     -> "Lakme Peach Milk Vit E Creme"
 *
 * Accepting the top hit would put a competitor's product, or the wrong variant,
 * on the customer's screen — and they order what they see.
 */

/**
 * Words that appear across half the catalog and so distinguish nothing.
 * A token outside this list has to be present in the candidate.
 */
const GENERIC = new Set([
  "the", "and", "with", "for", "of", "a", "an", "in", "to",
  "support", "supports", "brace", "belt", "splint", "series", "type",
  "pack", "size", "new", "pcs", "piece", "set", "kit",
  "cream", "creme", "gel", "lotion", "serum", "oil", "wash", "face",
  "skin", "body", "care", "daily",
]);

/** "caps" and "cap" are the same product; crude but enough for product names. */
function singular(token: string): string {
  if (token.length > 3 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 2 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenise(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&#\d+;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    // Single characters are punctuation debris — "Boxer's" splits to
    // ["boxer", "s"], and requiring that stray "s" would reject a good match.
    // Digits are kept: "3D", "10" and pack sizes matter.
    .filter((t) => t.length > 1 || /\d/.test(t))
    .map(singular);
}

/** Pack sizes like "30ml", "500 ml", "18g" — normalised to "30ml". */
export function packSizes(text: string): string[] {
  const out: string[] = [];
  const re = /(\d+(?:\.\d+)?)\s*(ml|l|g|gm|kg|mg)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const unit = m[2].toLowerCase() === "gm" ? "g" : m[2].toLowerCase();
    out.push(`${m[1]}${unit}`);
  }
  return out;
}

/**
 * Words that mark a *different* version of the same base product. If either
 * side uses one, the other has to as well — "Astra Elbow Crutch" and "Astra
 * Plus Elbow Crutch" are two products, as are the tinted and untinted
 * sunscreens.
 */
/**
 * Model tiers and formulation markers. Checked in BOTH directions: if either
 * side says "Max" or "Tinted" and the other doesn't, they are different
 * products. "Astra" and "Astra Max" are separate SKUs at separate prices.
 */
const TIER_QUALIFIERS = new Set([
  "plus", "pro", "max", "mini", "lite", "advance", "advanced", "premium",
  "tinted", "matte", "intense", "ultra",
]);

/**
 * Descriptive words. Only checked when *we* use them, because marketplace
 * titles pad with marketing copy — "Light Weight & Height Adjustable" would
 * otherwise read as a "light" variant, and a title mentioning "Left/Right"
 * as a left-only product.
 */
const DESCRIPTIVE_QUALIFIERS = new Set([
  "left", "right", "long", "short", "open", "closed", "hinged",
  "sensitive", "extra", "junior", "child", "adult", "kid", "baby",
]);

/**
 * Four-plus-digit runs are article codes. Vissco's 0642 and 0602 differ by one
 * digit and are unrelated products, so a code clash is decisive.
 */
function productCodes(text: string): string[] {
  return (text.match(/\b\d{4,}[A-Za-z]{0,2}\b/g) ?? []).map((c) => c.toLowerCase());
}

export type MatchInput = {
  /** Our product name, e.g. "Vissco Wrist Brace with Thumb Support". */
  ourName: string;
  /** Our brand, e.g. "Vissco". Required — this is the strongest signal. */
  ourBrand?: string | null;
  /** Our SKU, e.g. "PC-0642" — carries the article code for the clash check. */
  ourSku?: string | null;
  /** Our pack size text, e.g. "30 ml" or "Sizes S, M, L". */
  ourVariant?: string | null;
  /** The marketplace's product title. */
  theirName: string;
  /** The marketplace's brand/manufacturer fields, if it exposes them. */
  theirBrand?: string | null;
  /**
   * Set when the candidate was found by an exact article-code lookup on the
   * manufacturer's own store, rather than by searching on name.
   *
   * A code hit is stronger evidence than word overlap, so the
   * "every word must appear" rule is skipped — it otherwise rejects the same
   * product over spelling ("Aluminium"/"Aluminum") or inflection
   * ("Orthosis"/"Orthoses"). The brand, version-qualifier and pack-size checks
   * still apply, because those distinguish real product variants: "Astra" and
   * "Astra Max" share neither a product nor a photo.
   */
  codeMatched?: boolean;
};

export type MatchResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * A candidate is accepted only when the brand matches AND every distinguishing
 * word of our name is present. Marketplace titles are verbose, so extra words
 * on their side are fine — missing words on ours are not.
 */
export function isSameProduct(input: MatchInput): MatchResult {
  const theirTokens = new Set(tokenise(input.theirName));
  const theirBrandTokens = new Set(tokenise(input.theirBrand ?? ""));

  // 1. Brand. This alone rejects Tynor-for-Vissco and Aquahance-for-Dove.
  if (input.ourBrand) {
    const brandTokens = tokenise(input.ourBrand);
    const brandPresent = brandTokens.every(
      (t) => theirTokens.has(t) || theirBrandTokens.has(t),
    );
    if (!brandPresent) {
      return { ok: false, reason: `different brand (${input.theirBrand ?? input.theirName})` };
    }
  }

  // 2. Every distinguishing word of our name must appear.
  //    "Soft Creme" is not satisfied by "Vit E Creme".
  //
  //    Brand words are excluded — step 1 already settled the brand, and a
  //    single-brand store omits it from titles ("Boxer's Support Brace" on
  //    vissconext.com is obviously a Vissco product).
  const brandTokenSet = new Set(tokenise(input.ourBrand ?? ""));
  const ourTokens = tokenise(input.ourName).filter((t) => !brandTokenSet.has(t));

  if (!input.codeMatched) {
    const missing = ourTokens.filter((t) => !GENERIC.has(t) && !theirTokens.has(t));
    if (missing.length > 0) {
      return { ok: false, reason: `missing "${missing.join('", "')}"` };
    }
  }

  // 3. Version qualifiers must be symmetric. Checked in both directions,
  //    because the marketplace title is usually the more specific one:
  //    "Astra Elbow Crutch" must not match "Astra *Plus* Elbow Crutch".
  const ourSet = new Set(ourTokens);
  for (const q of TIER_QUALIFIERS) {
    const ourHas = ourSet.has(q);
    const theirHas = theirTokens.has(q);
    if (ourHas !== theirHas) {
      return {
        ok: false,
        reason: `"${q}" is on ${ourHas ? "ours" : "theirs"} only`,
      };
    }
  }
  for (const q of DESCRIPTIVE_QUALIFIERS) {
    if (ourSet.has(q) && !theirTokens.has(q)) {
      return { ok: false, reason: `we specify "${q}", they don't` };
    }
  }

  // 4. Article codes must not clash. 0642 and 0602 are different products.
  const ourCodes = productCodes(`${input.ourSku ?? ""} ${input.ourName}`);
  const theirCodes = productCodes(input.theirName);
  if (ourCodes.length > 0 && theirCodes.length > 0) {
    const shared = ourCodes.some((c) =>
      theirCodes.some((t) => t === c || t.startsWith(c) || c.startsWith(t)),
    );
    if (!shared) {
      return {
        ok: false,
        reason: `product code ${ourCodes.join("/")} vs ${theirCodes.join("/")}`,
      };
    }
  }

  // 5. Pack size must not contradict, when both state one.
  const ours = packSizes(`${input.ourName} ${input.ourVariant ?? ""}`);
  const theirs = packSizes(input.theirName);
  if (ours.length > 0 && theirs.length > 0) {
    const shared = ours.some((s) => theirs.includes(s));
    if (!shared) {
      return {
        ok: false,
        reason: `pack size ${ours.join("/")} vs ${theirs.join("/")}`,
      };
    }
  }

  return { ok: true };
}

/**
 * 1mg serves images through Gumlet with the transform in the path, including a
 * watermark layer. Dropping the transform segments yields the original.
 */
export function stripImageTransforms(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("gumlet.io")) return url;
    // Keep only the final path segment (the asset id).
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? `${u.origin}/${last}` : url;
  } catch {
    return url;
  }
}
