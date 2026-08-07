/**
 * Pure slug generation — no database, no imports. Kept separate from
 * slug.ts so the standalone import scripts can use it without pulling in the
 * app's Prisma singleton.
 */

/**
 * Devanagari -> Latin, so Hindi/Marathi product names produce a real slug
 * instead of an empty string. Deliberately simple: this is for URLs, not
 * scholarly transliteration.
 */
// Every key is quoted: the vowel signs are combining marks, which are not
// valid bare identifiers.
const DEVANAGARI: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o",
  "ं": "n", "ः": "h", "्": "", "़": "",
};

function transliterate(input: string): string {
  let out = "";
  for (const char of input) out += DEVANAGARI[char] ?? char;
  return out;
}

/**
 * Deterministic slug. No randomness — the same name always yields the same
 * base, so a slug can be recomputed and compared rather than guessed at.
 */
export function slugify(input: string): string {
  const base = transliterate(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  // Nothing survived (a name that was entirely punctuation, or an unmapped
  // script). Callers add a uniqueness suffix, so this stays safe.
  return base || "item";
}
