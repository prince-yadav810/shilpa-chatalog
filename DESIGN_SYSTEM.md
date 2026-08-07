# Shilpa — Visual Identity & Design System

## Direction

White background, mature and trustworthy — this should read like a well-run neighborhood shop's site, not a startup landing page. The subject is a chemist-plus-general-store: think everyday reliability, cleanliness, and directness, not flashy retail. Avoid anything that reads as a generic AI-generated template: no purple-to-indigo gradients, no glassmorphism cards, no oversized rounded corners on everything, no stock hero illustrations with abstract blobs, no default Tailwind indigo/violet as the primary color.

## Color

| Token | Hex | Use |
|---|---|---|
| `background` | `#FAFAF8` | Page background — a soft warm white, not stark `#FFFFFF`, to avoid a sterile/clinical feel |
| `surface` | `#FFFFFF` | Cards, product tiles, the header bar |
| `ink` | `#1C1F1D` | Primary text |
| `ink-muted` | `#5B615C` | Secondary text, captions, descriptions |
| `brand` | `#1F3D3A` | Deep charcoal-teal — logo area, nav, headings, primary buttons other than the WhatsApp CTA. This is the shop's own identity color. |
| `accent` | `#B8863B` | Muted ochre/mustard — used sparingly, for price emphasis, "in stock" badges, small highlights. Never as a large fill. |
| `whatsapp` | `#25D366` | Reserved **exclusively** for the "Order on WhatsApp" button. Don't reuse this green anywhere else on the page — its meaning ("this triggers a WhatsApp action") should stay unambiguous. |
| `border` | `#E4E1DA` | Hairline borders on cards and dividers — prefer these over drop shadows |

Two colors carry meaning, not decoration: `brand` says "this is Shilpa," `whatsapp` says "this button orders." Don't blur that by using green anywhere else.

## Typography

- **Display (headings):** *Fraunces* — a serif with real character, set at restrained weight (not heavy/decorative). Used for the site name, hero line, and section headings. This is what keeps the page from feeling like a generic sans-only SaaS template.
- **Body:** *Public Sans* (or IBM Plex Sans) — clean, highly readable, used for descriptions, nav, buttons, admin UI.
- **Price / data:** *IBM Plex Mono* — see Signature element below.

Set a clear type scale (e.g. hero 40–48px, section heading 24–28px, body 16px, caption 13px) and stick to it. Don't let font sizes drift ad hoc across components.

## Signature element: monospace pricing

Render every price in the monospace face (`IBM Plex Mono`), right-aligned within the product card, styled faintly like a price tag or till receipt — e.g. `₹  145.00`. This is the one deliberately distinctive touch: it's small, it's grounded in the actual subject (a shop, prices, receipts), and it repeats consistently across every product card, the cart-less order flow, and the admin product table. Don't add other decorative flourishes competing for attention — this is the one signature, everything else stays quiet.

## Layout

- **Header:** sticky, white surface, hairline bottom border. Logo + site name on the left, search bar center, WhatsApp contact number/icon on the right — always visible, since ordering is the point of the site.
- **Category navigation:** horizontal scrollable tabs on mobile, a simple sidebar or top row on desktop. Keep labels short and literal (category names customers already know — "Ice Cream," "Medicines" — not marketing language).
- **Product grid:** consistent card: image (top, consistent aspect ratio), name, variant, price (mono, right-aligned), WhatsApp button (full-width within the card on mobile). Use hairline borders (`border` token) rather than heavy drop shadows — flat, calm, mature.
- **Hero (homepage only):** a plain-language statement of what the site does and how ordering works, paired with either a real product photo or a simple category showcase — not an abstract gradient or illustration. Something like stating plainly that everything from the shop is a message away, followed immediately by the category grid — the hero's job is to get someone browsing within a few seconds, not to sell a concept.
- **Admin panel:** reuse the same type/color tokens but keep it purely functional — tables, forms, clear primary/secondary button distinction. No need for the hero treatment or decorative flourishes here; admin screens should feel efficient, not branded.
- **Whitespace:** generous. Let the product grid breathe — this is part of what reads as "mature" rather than "cluttered marketplace."

## Voice & copy

- Plain, direct, second-person where it helps ("Add to your order" not "Users may select items").
- Name things by what the customer or admin is doing, not how the system works — "Search products," not "Query catalog."
- Buttons say exactly what happens: "Order on WhatsApp," "Add product," "Import products" — not vague verbs like "Submit" or "Go."
- Empty states (no search results, empty category) should say what happened and suggest a next step, not just "No data."
- No emoji, no exclamation-mark enthusiasm, no marketing filler ("Discover amazing deals!"). This is a shop's practical ordering tool, and the copy should sound like it.

## What to avoid

- Purple/indigo gradients or default Tailwind theme colors as the primary palette.
- Glassmorphism, heavy blur, or neon accents.
- Numbered step markers (01 / 02 / 03) unless something is genuinely a sequence — nothing here is.
- Large decorative icons or illustration sets standing in for real product photography.
- Excessive border-radius on every element — use it deliberately (e.g. product cards), not as a global default on every button, input, and container.
