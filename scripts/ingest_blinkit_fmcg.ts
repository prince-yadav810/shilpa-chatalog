import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "glviggky",
  api_key: process.env.CLOUDINARY_API_KEY || "187877688226462",
  api_secret: process.env.CLOUDINARY_API_SECRET || "27yZf7XfTlhU2xpxbV2b7q66_04",
});

const prisma = new PrismaClient();
const INPUT_JSON = "/tmp/fmcg_blinkit_extracted_full.json";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function retryPrisma<T>(fn: () => Promise<T>, maxRetries = 4, delayMs = 1500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      console.warn(`⚠️ Prisma connection retry (${attempt}/${maxRetries})... Waiting ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function uploadToCloudinary(imageUrl: string, publicId: string): Promise<string> {
  if (!imageUrl) return "";
  try {
    const res = await cloudinary.uploader.upload(imageUrl, {
      folder: "shilpa/products",
      public_id: publicId,
      overwrite: true
    });
    return res.secure_url;
  } catch (err) {
    return imageUrl;
  }
}

async function main() {
  if (!fs.existsSync(INPUT_JSON)) {
    console.error(`File not found: ${INPUT_JSON}`);
    return;
  }

  const rawItems = JSON.parse(fs.readFileSync(INPUT_JSON, "utf-8"));
  console.log(`=== INGESTING ${rawItems.length} BLINKIT FMCG ITEMS INTO POSTGRESQL & CLOUDINARY ===`);

  const existingProducts = await retryPrisma(() =>
    prisma.product.findMany({ select: { name: true, slug: true } })
  );
  const existingSlugs = new Set(existingProducts.map((p) => p.slug));
  const existingNormNames = new Set(existingProducts.map((p) => normalizeName(p.name)));

  console.log(`✓ Loaded ${existingSlugs.size} existing product slugs and ${existingNormNames.size} normalized titles from database.`);

  let totalNewAdded = 0;
  let totalDuplicatesSkipped = 0;

  for (const item of rawItems) {
    const name = item.name;
    if (!name || name.length < 3) continue;

    const normName = normalizeName(name);
    let slug = slugify(name);

    // Strict Deduplication Check
    if (existingNormNames.has(normName) || existingSlugs.has(slug)) {
      totalDuplicatesSkipped++;
      continue;
    }

    const price = item.price;
    if (!price || price <= 0) continue;

    const mrp = item.mrp && item.mrp > price ? item.mrp : null;
    const variant = item.variant || null;

    // Find Brand
    const brandName = item.brand || name.split(" ")[0];
    const brandSlug = slugify(brandName);
    let brand = await retryPrisma(() => prisma.brand.findUnique({ where: { slug: brandSlug } }));
    if (!brand) {
      brand = await retryPrisma(() =>
        prisma.brand.create({
          data: { name: brandName, slug: brandSlug }
        })
      );
      console.log(`+ Created Brand "${brandName}"`);
    }

    // Find Category
    let category = await retryPrisma(() =>
      prisma.category.findUnique({ where: { slug: item.subcatSlug } })
    );
    if (!category) {
      category = await retryPrisma(() =>
        prisma.category.findUnique({ where: { slug: item.categorySlug } })
      );
    }
    if (!category) {
      category = await retryPrisma(() => prisma.category.findFirst({ where: { parentId: null } }));
    }
    if (!category) continue;

    // Upload to Cloudinary CDN
    const cdnUrl = await uploadToCloudinary(item.imageUrl, slug);

    try {
      await retryPrisma(() =>
        prisma.product.create({
          data: {
            name,
            slug,
            description: `${name} (${variant || "Standard Pack"}). Authentic retail stock at Shilpa.`,
            price,
            mrp,
            variant,
            imageUrl: cdnUrl || null,
            inStock: true,
            isFeatured: false,
            isArchived: false,
            categoryId: category.id,
            brandId: brand.id
          }
        })
      );

      existingSlugs.add(slug);
      existingNormNames.add(normName);
      totalNewAdded++;
      console.log(`  + [NEW BLINKIT FMCG] ${name} (₹${price}) [${brandName}]`);
    } catch (err: any) {
      if (err.code === "P2002") {
        totalDuplicatesSkipped++;
      } else {
        console.error(`  ⨯ Error inserting "${name}":`, err.message);
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 BLINKIT FMCG INGESTION FINISHED!`);
  console.log(`✓ Total New Products Inserted: ${totalNewAdded}`);
  console.log(`✓ Total Duplicate Products Skipped: ${totalDuplicatesSkipped}`);
  console.log(`==================================================`);
}

main().then(() => prisma.$disconnect());
