# Shilpa Catalog

A product catalog for Shilpa Medical & General Stores. Customers browse the shop's
range and send their order to the shop on WhatsApp — there is no checkout, no
payment, and no customer account. Staff manage the catalog through an admin panel.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Cloudinary · Vercel

## Setup

```bash
npm install
cp .env.example .env    # then fill it in
npm run db:migrate
npm run create-admin -- --username admin
npm run dev
```

`.env` needs:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection. On Supabase use the **pooled** URL (port 6543). |
| `DIRECT_URL` | Postgres direct connection (port 5432). Prisma migrates through this. |
| `AUTH_SECRET` | Signing key for the admin session. `openssl rand -base64 32` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Product image hosting. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, used for sitemap/canonical/OG URLs. |

The shop's WhatsApp number is **not** an env var — it lives in the database and is
edited at `/admin/settings`, so it can change without a redeploy.

## How the catalog is structured

Two dimensions, deliberately kept apart:

- **Categories** go exactly two levels deep — *Ice Cream* › *Tubs*. Products always
  sit in a subcategory; a product on a top-level category would never be listed.
- **Brands** are separate from the tree. That's what lets one product row serve
  `/c/ice-cream/tubs`, `/brand/amul`, and `/brand/amul/ice-cream` at once, without
  an "Amul Ice Cream" node multiplying the category tree per brand.

Product slugs are generated once, at creation, and never regenerated. The product
URL is what gets pasted into WhatsApp chats and status, so renaming or repricing
must not break links already sent.

## Loading a distributor catalog

Extraction from distributor PDFs happens **outside the app** — there is no PDF or
OCR pipeline in production to maintain. The flow:

1. Drop the PDF in `data/source-pdfs/` (gitignored — it's client data).
2. Extract it into `data/catalog/<supplier>.json` (see `EXAMPLE.json` for the shape,
   and `src/lib/catalog-file.ts` for the schema).
3. Source product images — the brand's own webshop first, then a marketplace
   listing, general search last.
4. `npm run upload-images -- data/catalog/<supplier>.json`
   Downloads each image onto our own Cloudinary and rewrites the file. We never
   hotlink someone else's server.
5. `npm run import-catalog -- data/catalog/<supplier>.json --dry-run`
   Prints exactly what would be created and changed, with a per-field diff.
6. Drop `--dry-run` to apply.

Rows match on `sku`, so **re-importing the same supplier updates rather than
duplicates**. When a distributor sends a revised price list, send the whole new
list through the same file — not a hand-built delta. Missing categories,
subcategories and brands are created automatically.

`mrp` is only ever set when the source states a real printed MRP. Never invent one
to make a discount badge appear.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:studio` | Browse the database |
| `npm run create-admin` | Create or reset an admin login (prompts for the password) |
| `npm run import-catalog` | Import a catalog JSON file |
| `npm run upload-images` | Move sourced images onto Cloudinary |

## Security notes

- Every mutating API route calls `requireAdmin()` itself. Middleware only redirects
  browsers away from admin pages — it is not the security boundary.
- Sessions are signed JWTs (`jose`, HS256). The cookie is verified on every request,
  not merely checked for presence.
- No credentials live in this repo. `npm run create-admin` prompts, and passwords are
  bcrypt-hashed at cost 12.
- Login is rate-limited to 5 attempts per 15 minutes per IP (in-memory, so per
  instance on serverless — enough to slow a naive brute force).

## Deployment

Vercel, with the env vars above set in the project settings. Run `npm run db:deploy`
against the production database when a migration ships.
