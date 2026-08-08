/**
 * Fixtures for the marketplace matcher.
 *
 *   npm run test-match
 *
 * Every "must reject" case below is a real result 1mg returned during
 * development. They are pinned here so that loosening a threshold later can't
 * silently start accepting a competitor's product again.
 */
import { isSameProduct, stripImageTransforms } from "../src/lib/product-match";

type Case = {
  label: string;
  ourName: string;
  ourBrand?: string;
  ourSku?: string;
  ourVariant?: string;
  codeMatched?: boolean;
  theirName: string;
  theirBrand?: string;
  expect: "accept" | "reject";
};

const CASES: Case[] = [
  // --- real failures observed from 1mg search ---
  {
    label: "competitor brand (Tynor for Vissco)",
    ourName: "Vissco Wrist Brace with Thumb Support",
    ourBrand: "Vissco",
    theirName: "Tynor E-06 Wrist Brace with Thumb Universal",
    theirBrand: "Tynor",
    expect: "reject",
  },
  {
    label: "different brand entirely (Aquahance for Dove)",
    ourName: "Dove Beauty Moisture Face Wash",
    ourBrand: "Dove",
    theirName: "Aquahance Moisture Surge Face Wash",
    theirBrand: "Aquahance",
    expect: "reject",
  },
  {
    label: "same brand, wrong variant (Vit E vs Soft)",
    ourName: "Lakme Peach Milk Soft Creme",
    ourBrand: "Lakme",
    theirName: "Lakme Peach Milk Vit E Creme Moisture-Riser",
    theirBrand: "Lakme",
    expect: "reject",
  },

  // --- wrong matches the first version of this matcher let through ---
  {
    label: "article code clash (0642 vs 0602)",
    ourName: "Vissco Universal Elastic Wrist Support",
    ourBrand: "Vissco",
    ourSku: "PC-0642",
    theirName: "Vissco Core 0602 Elastic Wrist Splint (Short) Black Universal",
    theirBrand: "Vissco",
    expect: "reject",
  },
  {
    label: "qualifier only on their side (Astra vs Astra Plus)",
    ourName: "Vissco Astra Elbow Crutch",
    ourBrand: "Vissco",
    ourSku: "PC-0904BP",
    theirName: "Vissco 0904BA Astra Plus Elbow Crutch Universal",
    theirBrand: "Vissco",
    expect: "reject",
  },
  {
    label: "tinted vs untinted sunscreen",
    ourName: "Lakme Sun Expert SPF 50 Sunscreen",
    ourBrand: "Lakme",
    ourSku: "LKM-27000",
    theirName: "Lakme Sun Expert Tinted Matte Sunscreen SPF 50 PA+++",
    theirBrand: "Lakme",
    expect: "reject",
  },

  // --- the near-misses the Vissco matcher caught earlier ---
  {
    label: "calf vs thigh",
    ourName: "Vissco Loop Elastic Calf Support",
    ourBrand: "Vissco",
    theirName: "Vissco Loop Elastic Support - Thigh",
    expect: "reject",
  },
  {
    label: "donut padding vs plain",
    ourName: "Vissco 3D Knee Cap with Donut Padding",
    ourBrand: "Vissco",
    theirName: "Vissco 3D Knee Cap",
    expect: "reject",
  },
  {
    label: "Superio vs Imperio",
    ourName: "Vissco Superio Aluminium Wheelchair with Removable Big Wheels",
    ourBrand: "Vissco",
    theirName: "Vissco Imperio Wheelchair with Removable Big Wheels",
    expect: "reject",
  },
  {
    label: "pack size mismatch",
    ourName: "Lakme Blush & Glow Kiwi Face Wash",
    ourBrand: "Lakme",
    ourVariant: "100g",
    theirName: "Lakme Blush & Glow Kiwi Face Wash 50g",
    expect: "reject",
  },

  // --- code hit on the manufacturer's own store: spelling must not block ---
  {
    label: "code hit, British vs American spelling",
    ourName: "Vissco Avanti Plus - T Shape Aluminium Quadripod Stick",
    ourBrand: "Vissco",
    ourSku: "PC-2909",
    codeMatched: true,
    theirName: "Avanti Plus - T Shape Aluminum Quadripod Stick | Lightweight Walking Stick",
    theirBrand: "Vissco",
    expect: "accept",
  },
  {
    label: "code hit, singular vs plural (Orthosis/Orthoses)",
    ourName: "Vissco Ankle Foot Orthosis (AFO)",
    ourBrand: "Vissco",
    ourSku: "PC-0740",
    codeMatched: true,
    theirName: "Ankle Foot Orthoses (AFO) | Maintains and Supports Foot to prevent Foot Drop",
    theirBrand: "Vissco",
    expect: "accept",
  },
  {
    label: "code hit still rejects a different version (Astra vs Astra Max)",
    ourName: "Vissco Astra Elbow Crutch",
    ourBrand: "Vissco",
    ourSku: "PC-0904BP",
    codeMatched: true,
    theirName: "Astra Max Elbow Crutches, With Adjustable Height & Movable Elbow Support",
    theirBrand: "Vissco",
    expect: "reject",
  },

  // --- Amul: flavour names sit very close together ---
  {
    label: "Vanilla Royale is not Vanilla Magic",
    ourName: "Amul Vanilla Royale",
    ourBrand: "Amul",
    ourVariant: "500 mL",
    theirName: "Amul Vanilla Magic Ice Cream 500 ml",
    theirBrand: "Amul",
    expect: "reject",
  },
  {
    label: "plain Chocobar is not Dark Chocolate Chocobar",
    ourName: "Amul Chocobar",
    ourBrand: "Amul",
    ourVariant: "60 mL",
    theirName: "Amul Dark Chocolate Chocobar Ice Cream Stick 60 ml",
    theirBrand: "Amul",
    expect: "reject",
  },
  {
    label: "750 mL is not 500 mL",
    ourName: "Amul Kesar Pista Royale",
    ourBrand: "Amul",
    ourVariant: "750 mL",
    theirName: "Amul Kesar Pista Royale Ice Cream 500 ml",
    theirBrand: "Amul",
    expect: "reject",
  },
  {
    label: "a competitor's tub is rejected on brand",
    ourName: "Amul Butterscotch Bliss",
    ourBrand: "Amul",
    theirName: "Kwality Wall's Butterscotch Bliss Ice Cream Tub",
    theirBrand: "Kwality Wall's",
    expect: "reject",
  },

  // --- correct matches that must keep working ---
  {
    label: "exact product, verbose marketplace title",
    ourName: "Vissco Knee Caps",
    ourBrand: "Vissco",
    theirName: "Vissco 0705 Knee Cap Large Beige",
    theirBrand: "Vissco",
    expect: "accept",
  },
  {
    label: "brace vs splint wording",
    ourName: "Vissco Forearm Brace (Long)",
    ourBrand: "Vissco",
    theirName: "Vissco Forearm Splint (Long)",
    expect: "accept",
  },
  {
    label: "matching pack size",
    ourName: "Lakme Blush & Glow Kiwi Face Wash",
    ourBrand: "Lakme",
    ourVariant: "100g",
    theirName: "Lakme Blush & Glow Kiwi Face Wash 100 g Tube",
    expect: "accept",
  },
  {
    label: "our size run vs their single size",
    ourName: "Vissco Cervical Collar (Soft)",
    ourBrand: "Vissco",
    ourVariant: "Sizes S, M, L, XL, XXL",
    theirName: "Vissco Cervical Collar Soft Medium",
    theirBrand: "Vissco",
    expect: "accept",
  },
];

let failed = 0;

for (const c of CASES) {
  const result = isSameProduct({
    ourName: c.ourName,
    ourBrand: c.ourBrand,
    ourSku: c.ourSku,
    ourVariant: c.ourVariant,
    codeMatched: c.codeMatched,
    theirName: c.theirName,
    theirBrand: c.theirBrand,
  });

  const got = result.ok ? "accept" : "reject";
  const pass = got === c.expect;
  if (!pass) failed += 1;

  console.log(
    `  ${pass ? "ok  " : "FAIL"}  ${c.label}\n        expected ${c.expect}, got ${got}${
      result.ok ? "" : ` — ${result.reason}`
    }`,
  );
}

// Watermark stripping.
const watermarked =
  "https://onemg.gumlet.io/l_watermark_346,w_380,h_380/a_ignore,w_380,h_380,c_fit,q_auto,f_auto/70cbf1f508ef4191945e1ddba8e14f19.jpg";
const stripped = stripImageTransforms(watermarked);
const expected = "https://onemg.gumlet.io/70cbf1f508ef4191945e1ddba8e14f19.jpg";
const okStrip = stripped === expected;
if (!okStrip) failed += 1;
console.log(`  ${okStrip ? "ok  " : "FAIL"}  watermark transform stripped\n        ${stripped}`);

console.log(`\n  ${CASES.length + 1} checks, ${failed} failed\n`);
if (failed > 0) process.exitCode = 1;
