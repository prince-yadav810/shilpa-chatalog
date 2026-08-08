import "dotenv/config";
/**
 * Import a catalog file into the database.
 *
 *   npm run import-catalog -- data/catalog/amul.json --dry-run
 *   npm run import-catalog -- data/catalog/amul.json
 *
 * Idempotent: rows are matched on `sku`, so re-running the same file updates
 * the existing products rather than duplicating them. That's what makes a
 * monthly re-import safe — send the whole updated price list every time, not
 * a hand-built delta.
 *
 * This is a maintainer tool. It is deliberately not exposed in the admin
 * panel: catalog extraction from distributor PDFs happens outside the app.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { catalogFileSchema, type CatalogRow } from "../src/lib/catalog-file";
import { slugify } from "../src/lib/slugify";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const filePath = args.find((a) => !a.startsWith("--"));

type Plan = {
  creates: CatalogRow[];
  updates: { row: CatalogRow; changes: string[] }[];
  unchanged: number;
  newCategories: string[];
  newBrands: string[];
  warnings: string[];
};

function money(n: number) {
  return `₹${n.toFixed(2)}`;
}

/**
 * Slugs here can't use the DB-checking helper from src/lib/slug.ts (it imports
 * the app's Prisma singleton), so uniqueness is resolved against a set that
 * accumulates as we go.
 */
function uniqueAgainst(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  taken.add(candidate);
  return candidate;
}

async function main() {
  if (!filePath) {
    throw new Error(
      "Usage: npm run import-catalog -- <path/to/catalog.json> [--dry-run]",
    );
  }

  const abs = path.resolve(process.cwd(), filePath);
  const parsed = catalogFileSchema.safeParse(
    JSON.parse(readFileSync(abs, "utf8")),
  );

  if (!parsed.success) {
    console.error(`\n${filePath} has problems:\n`);
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Fix the file and run again.");
  }

  const file = parsed.data;
  console.log(
    `\n${file.source}${file.sourceDate ? ` (${file.sourceDate})` : ""} — ${
      file.products.length
    } rows\n`,
  );

  // Duplicate SKUs within one file would make the import order-dependent.
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const row of file.products) {
    if (seen.has(row.sku)) dupes.add(row.sku);
    seen.add(row.sku);
  }
  if (dupes.size > 0) {
    throw new Error(
      `Duplicate SKUs in the file: ${[...dupes].join(", ")}. Each row needs its own SKU.`,
    );
  }

  const [existingProducts, existingCategories, existingBrands] = await Promise.all([
    prisma.product.findMany({
      where: { sku: { in: file.products.map((p) => p.sku) } },
      include: { category: true, brand: true },
    }),
    prisma.category.findMany(),
    prisma.brand.findMany(),
  ]);

  const bySku = new Map(existingProducts.map((p) => [p.sku!, p]));
  const catByKey = new Map(
    existingCategories.map((c) => [`${c.parentId ?? "root"}::${c.name.toLowerCase()}`, c]),
  );
  const brandByName = new Map(existingBrands.map((b) => [b.name.toLowerCase(), b]));

  const plan: Plan = {
    creates: [],
    updates: [],
    unchanged: 0,
    newCategories: [],
    newBrands: [],
    warnings: [],
  };

  for (const row of file.products) {
    if (row.imageUrl && !row.imageUrl.includes("res.cloudinary.com")) {
      plan.warnings.push(
        `${row.sku}: image is not on Cloudinary yet — run "npm run upload-images -- ${filePath}" first`,
      );
    }
    if (row.mrp != null && row.mrp < row.price) {
      plan.warnings.push(
        `${row.sku}: MRP ${money(row.mrp)} is below the selling price ${money(row.price)}`,
      );
    }

    const existing = bySku.get(row.sku);
    if (!existing) {
      plan.creates.push(row);
      continue;
    }

    const changes: string[] = [];
    if (existing.name !== row.name) changes.push(`name: "${existing.name}" → "${row.name}"`);
    if (existing.price !== row.price)
      changes.push(`price: ${money(existing.price)} → ${money(row.price)}`);
    if ((existing.mrp ?? null) !== (row.mrp ?? null))
      changes.push(
        `mrp: ${existing.mrp ? money(existing.mrp) : "—"} → ${row.mrp ? money(row.mrp) : "—"}`,
      );
    if ((existing.variant ?? null) !== (row.variant ?? null))
      changes.push(`variant: ${existing.variant ?? "—"} → ${row.variant ?? "—"}`);
    if (row.imageUrl && existing.imageUrl !== row.imageUrl) changes.push("image");
    if (existing.category.name.toLowerCase() !== row.subcategory.toLowerCase())
      changes.push(`category: ${existing.category.name} → ${row.subcategory}`);
    if ((existing.brand?.name ?? null) !== (row.brand ?? null))
      changes.push(`brand: ${existing.brand?.name ?? "—"} → ${row.brand ?? "—"}`);

    if (changes.length > 0) plan.updates.push({ row, changes });
    else plan.unchanged += 1;
  }

  // Which categories/brands the file needs that don't exist yet.
  for (const row of file.products) {
    const parentKey = `root::${row.category.toLowerCase()}`;
    if (!catByKey.has(parentKey) && !plan.newCategories.includes(row.category)) {
      plan.newCategories.push(row.category);
    }
    const childLabel = `${row.category} › ${row.subcategory}`;
    const parent = catByKey.get(parentKey);
    const childKey = `${parent?.id ?? "root"}::${row.subcategory.toLowerCase()}`;
    if (
      (!parent || !catByKey.has(childKey)) &&
      !plan.newCategories.includes(childLabel)
    ) {
      plan.newCategories.push(childLabel);
    }
    if (row.brand && !brandByName.has(row.brand.toLowerCase()) && !plan.newBrands.includes(row.brand)) {
      plan.newBrands.push(row.brand);
    }
  }

  // ---- report ----
  console.log(`  create    ${plan.creates.length}`);
  console.log(`  update    ${plan.updates.length}`);
  console.log(`  unchanged ${plan.unchanged}`);
  if (plan.newCategories.length)
    console.log(`\n  new categories: ${plan.newCategories.join(", ")}`);
  if (plan.newBrands.length) console.log(`  new brands: ${plan.newBrands.join(", ")}`);

  if (plan.updates.length > 0) {
    console.log("\n  changes:");
    for (const { row, changes } of plan.updates.slice(0, 40)) {
      console.log(`    ${row.sku} ${row.name}`);
      for (const c of changes) console.log(`        ${c}`);
    }
    if (plan.updates.length > 40)
      console.log(`    …and ${plan.updates.length - 40} more`);
  }

  if (plan.warnings.length > 0) {
    console.log("\n  warnings:");
    for (const w of plan.warnings) console.log(`    ! ${w}`);
  }

  if (dryRun) {
    console.log("\nDry run — nothing was written.\n");
    return;
  }

  if (plan.creates.length === 0 && plan.updates.length === 0) {
    console.log("\nNothing to do.\n");
    return;
  }

  // ---- write ----
  const takenProductSlugs = new Set(
    (await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug),
  );
  const takenCatSlugs = new Set(
    (await prisma.category.findMany({ select: { slug: true } })).map((c) => c.slug),
  );
  const takenBrandSlugs = new Set(
    (await prisma.brand.findMany({ select: { slug: true } })).map((b) => b.slug),
  );

  /*
   * Categories and brands are resolved first, outside any transaction. There
   * are only a handful of them and creating one is idempotent in effect — a
   * re-run finds the existing row.
   */
  const catCache = new Map(catByKey);
  const brandCache = new Map(brandByName);

  async function ensureCategory(name: string, parentId: string | null) {
    const key = `${parentId ?? "root"}::${name.toLowerCase()}`;
    const hit = catCache.get(key);
    if (hit) return hit;

    const created = await prisma.category.create({
      data: {
        name,
        slug: uniqueAgainst(slugify(name), takenCatSlugs),
        parentId,
        sortOrder: catCache.size,
      },
    });
    catCache.set(key, created);
    return created;
  }

  async function ensureBrand(name: string) {
    const hit = brandCache.get(name.toLowerCase());
    if (hit) return hit;
    const created = await prisma.brand.create({
      data: { name, slug: uniqueAgainst(slugify(name), takenBrandSlugs) },
    });
    brandCache.set(name.toLowerCase(), created);
    return created;
  }

  async function resolve(row: CatalogRow) {
    const parent = await ensureCategory(row.category, null);
    const child = await ensureCategory(row.subcategory, parent.id);
    const brand = row.brand ? await ensureBrand(row.brand) : null;
    return { categoryId: child.id, brandId: brand?.id ?? null };
  }

  const createData: Prisma.ProductCreateManyInput[] = [];
  for (const row of plan.creates) {
    const { categoryId, brandId } = await resolve(row);
    createData.push({
      name: row.name,
      slug: uniqueAgainst(slugify(row.name), takenProductSlugs),
      sku: row.sku,
      price: row.price,
      mrp: row.mrp ?? null,
      variant: row.variant ?? null,
      description: row.description ?? null,
      imageUrl: row.imageUrl ?? null,
      inStock: row.inStock ?? true,
      categoryId,
      brandId,
    });
  }

  const updateOps = [];
  for (const { row } of plan.updates) {
    const { categoryId, brandId } = await resolve(row);
    updateOps.push(
      prisma.product.update({
        where: { sku: row.sku },
        data: {
          name: row.name,
          price: row.price,
          mrp: row.mrp ?? null,
          variant: row.variant ?? null,
          description: row.description ?? null,
          // Never clear an image the admin attached by hand with a null row.
          ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
          ...(row.inStock === undefined ? {} : { inStock: row.inStock }),
          categoryId,
          brandId,
          // slug is deliberately untouched — the product URL must survive edits.
        },
      }),
    );
  }

  /*
   * One batched transaction rather than a row-at-a-time interactive one.
   *
   * The interactive version issued a separate round trip per product, which is
   * fine locally but timed out against a hosted database in another region:
   * 129 inserts took over three minutes. `createMany` sends them as a single
   * statement, and the array form of `$transaction` pipelines the updates.
   */
  await prisma.$transaction([
    ...(createData.length > 0
      ? [prisma.product.createMany({ data: createData })]
      : []),
    ...updateOps,
  ]);

  console.log(
    `\nDone. ${plan.creates.length} created, ${plan.updates.length} updated.\n`,
  );
}

main()
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
