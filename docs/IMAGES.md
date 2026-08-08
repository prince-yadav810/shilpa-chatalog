# Product images

355 of 425 products have an image (84%). All are stored on our own Cloudinary
account — nothing is hotlinked. That matters: the demo linked directly to
`visscocore.com`, and that domain no longer resolves at all, so every one of
those images would be a broken box today.

## How they were sourced

| Brand | With image | Source |
|---|---|---|
| Vissco | 200 / 212 | `www.vissco.com` WooCommerce API + `vissconext.com` Shopify feed |
| Lakme | 118 / 148 | `www.lakmeindia.com` Shopify feed, 1mg fallback |
| Pond's | 27 / 41 | `www.ponds.in` Shopify feed |
| Simple | 3 / 4 | `simpleskincare.in` feed, 1mg fallback |
| Dove, Vaseline, Novology | 7 / 20 | no public feed; found via 1mg where verifiable |

Matching is by article code wherever possible — Lakme's Shopify variant SKU
`27309` is the same `BP CODE 27309` printed in the distributor PDF, so it's an
identity match, not a guess. Shade variants take their own variant image rather
than the first product photo, so the three CC Tinted Serum shades each show the
correct swatch.

### Rebuilding

```bash
npm run fetch-vissco-index
npm run fetch-shopify-index -- www.lakmeindia.com lakme
npm run fetch-shopify-index -- www.ponds.in ponds
npm run fetch-shopify-index -- simpleskincare.in simple

npm run match-vissco-images -- --dry-run     # then without --dry-run
npm run match-shopify-images -- --dry-run    # then without --dry-run

npm run upload-images -- data/catalog/<file>.json
npm run import-catalog -- data/catalog/<file>.json
```

## Why 112 have no image

Three separate reasons, none of them a gap in the tooling:

1. **47** — Lakme/Pond's trade pack sizes and discontinued lines that the brands
   don't sell on their own D2C stores. Only 2 of 49 would even match by name.
2. **24** — Dove, Vaseline, Novology and Simple. Eight candidate domains were
   probed; none expose a product feed, and these brands don't appear in the
   Lakme or Pond's feeds either.
3. **39** — Vissco products where the only candidate was a *different* product.
   The matcher refused them on purpose: "Loop Elastic **Calf** Support" would
   have been given the **thigh** photo, and "3D Knee Cap with **Donut Padding**"
   the plain 3D Knee Cap photo.

A wrong product photo is worse than none — the customer orders what's in the
picture. These are left blank deliberately; the storefront shows a neutral
placeholder and everything else about the product still works.

## Filling the rest later

Two options, whenever it's wanted:

- **Shop staff upload their own.** The admin product form has a working image
  upload (Cloudinary-backed, 8 MB limit). A phone photo of the actual shelf item
  is often better than a catalog render, and needs no developer.
- **Extract from the distributor PDFs.** The PDFs contain the manufacturer's own
  product photography, and it does extract cleanly — a test on Lakme page 64
  produced exactly 4 clean product shots on white for its 4 products.
  The risk is *pairing*: images come out in page order with no labels, so one
  product with two photos silently shifts every later pairing by one. This needs
  a per-page human check, not a blind run.
