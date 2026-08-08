# Catalog extraction status

Who is doing what, so the same pages don't get extracted twice.
**Update this file when a PDF is finished.**

| PDF (`data/source-pdfs/`) | Pages | Output file | Owner | Status |
|---|---|---|---|---|
| `Vissco OSG Catalogue with MRP (1).pdf` **pages 9–16 only** | 8 | `vissco-osg-2.json` | **Gemini** | **next** — pages 1–8 already done in `vissco-osg.json` |
| `Vissco Mobility MRP.pdf` | 12 | `vissco-mobility.json` | **Gemini** | **done** (83 products) |
| `Lakme PRO Skin TBF_Consolidated_03-10-2024_Lowres.pdf` | 86 | `lakme-pro-skin.json` | **Gemini** | **done** (210 products) |
| `LAKME_BOOKLET_TBF_Consolidated_2024.pdf` | 120 | `lakme-booklet.json` | **Gemini** | **next** — one product per page, MRP/Margin/TUR. Many pages print no BP code: omit those rows rather than inventing a SKU |
| `Pro NON Colors MOC 8'26.pdf` | 48 | `lakme-pro-non-colors.json` | **Gemini** | **done** (4 products) |
| `Pond's PRO TBF-2024.pdf` | 11 | `ponds-pro.json` | **Gemini** | **done** (33 products) |
| `SKIN FOLDER-2024.pdf` | 46 | — | — | **skip** — marketing slide deck, no codes or prices |
| `Lakme Skin Grid April 24.pdf` | 18 | — | — | **skip** — feature grid, no codes or prices |
| `Lakme Color Grid   MARCH 24.pdf` | 17 | — | — | **skip** — feature grid, no codes or prices |

Claude keeps `vissco-osg.json` to avoid two people editing one file. Gemini takes
whole untouched PDFs, one per session, writing a new file each time.

## Where things stand

**Live at https://shilpa-catalog.vercel.app** — 425 products, 355 with images,
on Supabase. Every later import updates the live site.

34 rows were removed as duplicates: the Pond's PRO and Lakme PRO Skin PDFs list
the same products. 28 of those 34 pairs agreed exactly on price, which is good
evidence both extractions are sound; the 6 that disagree are in the handover
notes for the shop to confirm.

Images: see [docs/IMAGES.md](../../docs/IMAGES.md) for how the remaining 70 break
down and why they're deliberately blank rather than guessed at.

## Conventions already set

These are fixed by the 129 rows already extracted — new files must match, or the
website ends up with duplicate-looking sections and inconsistent naming.

- **Category tree is two levels.** `category` is the broad section
  ("Orthopaedic Supports"), `subcategory` is the catalog's own heading
  ("Knee & Calf Supports"). Spell both identically every time.
- **`price` is the printed MRP**, and `mrp` is omitted. The shop sells at MRP;
  an `mrp` equal to `price` would render a meaningless "0% off" badge.
- **Sizes go in `variant`** ("Sizes S, M, L, XL, XXL"), not separate products,
  when one price covers the whole run.
- **SKU is the printed code**, hyphenated: `PC 0301A` → `PC-0301A`. Never invented.
- **Names start with the brand**: "Vissco Cervical Collar Regular with Chin Support".

## Subcategories in use so far

Under `Orthopaedic Supports`: Head & Neck Supports · Wrist, Elbow & Finger
Supports · Chest, Rib & Sternal Supports · Shoulder Supports · Abdomen & Pelvic
Supports · Back Supports · Knee & Calf Supports · Ankle & Foot Supports

Reuse these exact strings where a product fits; only add a new one when it
genuinely doesn't.

## Flow

1. Paste [`docs/EXTRACTION_PROMPT.md`](../../docs/EXTRACTION_PROMPT.md) into
   Antigravity with the PDF, one file per session.
2. Gemini writes `data/catalog/<name>.json`.
3. `npm run validate-catalog` — catches duplicate codes, misread prices,
   inconsistent spellings. **Errors block the import.**
4. `npm run import-catalog -- data/catalog/<name>.json --dry-run` — shows
   exactly what would change.
5. Drop `--dry-run` to apply.
6. Images come after: source them, then `npm run upload-images`.
7. Update the table above.
