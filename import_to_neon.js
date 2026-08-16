const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const NEON_URL =
  "postgresql://neondb_owner:npg_dXM3zUuGQ8gc@ep-spring-breeze-b3nkxpfx.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connection_limit=1&pool_timeout=60";

const prisma = new PrismaClient({
  datasources: { db: { url: NEON_URL } },
});

async function insertChunked(label, items, CHUNK, insertFn) {
  if (items.length === 0) { console.log(`  ${label}: nothing to insert`); return; }
  let done = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await insertFn(chunk);
    done += chunk.length;
    process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
  }
  console.log(`\r  ${label}: ${done}/${items.length} ✅`);
}

async function main() {
  const raw = fs.readFileSync("backup_2026-08-16T06-49-27-075Z.json", "utf8");
  const { counts, data } = JSON.parse(raw);
  console.log("Source backup:", counts);
  console.log("Starting import into Neon...\n");

  // ── 1. Parent categories (no parentId) ─────────────────────────
  const parents = data.categories.filter((c) => !c.parentId);
  const children = data.categories.filter((c) => !!c.parentId);

  await insertChunked("Parent categories", parents, 100, (chunk) =>
    prisma.category.createMany({
      data: chunk.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        imageUrl: c.imageUrl ?? null,
        isActive: c.isActive,
        parentId: null,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 2. Child categories ─────────────────────────────────────────
  await insertChunked("Child categories", children, 100, (chunk) =>
    prisma.category.createMany({
      data: chunk.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        imageUrl: c.imageUrl ?? null,
        isActive: c.isActive,
        parentId: c.parentId,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 3. Brands ───────────────────────────────────────────────────
  await insertChunked("Brands", data.brands, 100, (chunk) =>
    prisma.brand.createMany({
      data: chunk.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl ?? null,
        isActive: b.isActive,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 4. Products ─────────────────────────────────────────────────
  await insertChunked("Products", data.products, 200, (chunk) =>
    prisma.product.createMany({
      data: chunk.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku ?? null,
        price: p.price,
        mrp: p.mrp ?? null,
        variant: p.variant ?? null,
        description: p.description ?? null,
        imageUrl: p.imageUrl ?? null,
        inStock: p.inStock,
        isArchived: p.isArchived,
        isFeatured: p.isFeatured,
        featuredOrder: p.featuredOrder,
        categoryId: p.categoryId,
        brandId: p.brandId ?? null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })),
      skipDuplicates: true,
    })
  );

  // ── 5. Site settings ────────────────────────────────────────────
  if (data.settings.length > 0) {
    const s = data.settings[0];
    await prisma.siteSettings.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        storeName: s.storeName,
        whatsappNumber: s.whatsappNumber,
        promoBannerText: s.promoBannerText ?? null,
        promoBannerLink: s.promoBannerLink ?? null,
      },
      update: {
        storeName: s.storeName,
        whatsappNumber: s.whatsappNumber,
        promoBannerText: s.promoBannerText ?? null,
        promoBannerLink: s.promoBannerLink ?? null,
      },
    });
    console.log("  Settings: 1 ✅");
  }

  // ── 6. Final verification ───────────────────────────────────────
  const [products, categories, brands, settings] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.siteSettings.count(),
  ]);

  console.log("\n── Verification ────────────────────────────────");
  console.log(`  Products:   ${products}  (expected: ${counts.products})  ${products === counts.products ? "✅" : "❌"}`);
  console.log(`  Categories: ${categories}  (expected: ${counts.categories})  ${categories === counts.categories ? "✅" : "❌"}`);
  console.log(`  Brands:     ${brands}  (expected: ${counts.brands})  ${brands === counts.brands ? "✅" : "❌"}`);
  console.log(`  Settings:   ${settings}  (expected: ${counts.settings})  ${settings === counts.settings ? "✅" : "❌"}`);

  const ok = products === counts.products && categories === counts.categories &&
             brands === counts.brands && settings === counts.settings;

  if (ok) {
    console.log("\n🎉 ALL COUNTS MATCH — Neon import verified. Safe to switch over!");
  } else {
    console.log("\n❌ MISMATCH — do NOT switch over. Check errors above.");
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ Import failed:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
