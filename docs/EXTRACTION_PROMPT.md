# Catalog extraction prompt

Paste the block below into Antigravity (Gemini), with the target PDF attached or
its path given. Do **one PDF per session** — these files run to 120 pages and
quality drops when several are mixed together.

Replace `<PDF FILENAME>` and `<OUTPUT FILENAME>` before sending. Both are listed
for each file in [`data/catalog/STATUS.md`](../data/catalog/STATUS.md).

**If STATUS.md gives a page range for the file, add this line to the prompt:**

> Only extract pages `<FROM>`–`<TO>`. The earlier pages are already done and
> live in another file. For categories and subcategories, reuse the exact names
> listed below rather than inventing new ones — a spelling difference creates a
> second, duplicate-looking section on the website.
>
> Existing subcategories under **Orthopaedic Supports**: Head & Neck Supports ·
> Wrist, Elbow & Finger Supports · Chest, Rib & Sternal Supports · Shoulder
> Supports · Abdomen & Pelvic Supports · Back Supports · Knee & Calf Supports ·
> Ankle & Foot Supports

---

You are extracting a distributor product catalog into structured JSON for a
retail shop's website. Accuracy matters more than speed: a wrong price or a
wrong product code goes live in front of customers and gets ordered.

**Input:** `data/source-pdfs/<PDF FILENAME>`
**Output:** write a single file to `data/catalog/<OUTPUT FILENAME>`

## File format

```json
{
  "source": "<the catalog's own title, e.g. Vissco Mobility MRP>",
  "sourceDate": "2026-08-08",
  "notes": "<anything the next person should know — pages skipped, prices that looked odd>",
  "products": [
    {
      "sku": "PC-0301A",
      "name": "Vissco Cervical Collar Regular with Chin Support",
      "category": "Orthopaedic Supports",
      "subcategory": "Head & Neck Supports",
      "brand": "Vissco",
      "price": 415,
      "variant": "Sizes S, M, L, XL, XXL",
      "description": null,
      "imageUrl": null,
      "inStock": true
    }
  ]
}
```

## Field rules

**`sku`** — the product code printed in the catalog (Vissco calls it a PC code,
Lakme calls it a BP CODE), with spaces replaced by hyphens: `PC 0301A` →
`PC-0301A`, `27850` → `LKM-27850`. This is the key that makes next month's
re-import an update rather than a duplicate, so it must be exact and it must be
unique within the file.

**Never invent a code.** If a product has no printed code, leave the row out
entirely and list it under `notes` instead. A made-up code looks fine today and
silently becomes a duplicate product on the next import, because nothing will
match it. Products without codes get added by hand in the admin panel.

**`name`** — start with the brand, then the product name as printed. Expand
obvious abbreviations (`W/o` → `without`, `Adj.` → `Adjustable`) and fix clear
typos in the source (the Vissco catalog prints "Dnyamic" for "Dynamic"). Do not
invent marketing language.

**`category` / `subcategory`** — `category` is the broad section, `subcategory`
is the heading the product sits under in the catalog. Use the catalog's own
section headings verbatim ("Head & Neck Supports", "Knee & Calf Supports"). Every
product needs both. Keep the spelling identical across all rows — "Knee & Calf
Supports" and "Knee and Calf Supports" would create two separate sections on the
website.

**`brand`** — the manufacturer: `Vissco`, `Lakme`, `Pond's`. Same spelling every
time.

**`price`** — the printed MRP as a plain number, no `₹` and no commas. `MRP ₹
1,130/-` → `1130`. This shop sells at MRP.

**`mrp`** — **omit this field entirely.** It exists for products sold below MRP,
and setting it equal to `price` would render a meaningless "0% off" badge. Leave
it out unless the catalog shows two different prices for the same item.

**`variant`** — the pack size, or the size run the single price covers:
- `S | M | L | XL | XXL` → `"Sizes S, M, L, XL, XXL"`
- `UNIVERSAL` → `"Universal"`
- `STANDARD / SPECIAL` → `"Standard or Special"`
- `30ml` → `"30 ml"`
- No size shown → omit the field

**`description`** — omit unless the catalog prints real product copy (features,
materials, what it's for). Never write your own.

**`imageUrl`** — always `null`. Images are sourced separately.

**`inStock`** — always `true`.

## Rules that are easy to get wrong

1. **One tile can be two products.** When a tile prints two codes with two
   prices — `PC 1405/1406 Neoprene Lumbar Belt 9" / 6"`, `MRP 2475` and `MRP
   2225` — emit two rows with distinct SKUs and names. Same when two codes share
   one price but differ in type: `PC 0718A (Back Closure)` and `PC 0718B (Front
   Closure)` are two rows at the same price, with the distinction in the name.

2. **Sizes are not separate products.** A single MRP covering `S | M | L | XL |
   XXL` is one row; the size run goes in `variant`. Only split when the sizes
   have *different* prices.

3. **Multi-column layouts interleave.** In these PDFs the columns are drawn out
   of order, so plain text extraction pairs the wrong price with the wrong code.
   Read each product tile as a visual unit — code, name, size box, MRP box
   together — rather than reading across the page.

4. **Skip non-product pages.** Covers, contents, brand-story spreads, feature
   grids and dealer information contain no orderable products. Note which pages
   you skipped.

5. **Marketing "feature grids" have no prices.** Two of the Lakme files are
   benefit charts with no codes and no MRP. If a file turns out to be entirely
   like this, produce no products and say so in `notes` — do not manufacture
   rows from it.

## Before you finish

- Every `sku` appears exactly once in the file.
- Every product has `sku`, `name`, `category`, `subcategory`, `brand`, `price`.
- No price is `0`, negative, or absurd for the item (a ₹90 wrist band and a
  ₹3,600 corset are both plausible; a ₹4 collar is a misread).
- The JSON parses.

Then report: how many products, which pages you covered, which pages you skipped
and why, and any row where you were unsure of the price or code. **Flag your
uncertainty rather than guessing** — a flagged row gets checked in thirty
seconds; a confidently wrong price reaches a customer.
