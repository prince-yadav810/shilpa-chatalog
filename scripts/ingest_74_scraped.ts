import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "glviggky",
  api_key: process.env.CLOUDINARY_API_KEY || "187877688226462",
  api_secret: process.env.CLOUDINARY_API_SECRET || "27yZf7XfTlhU2xpxbV2b7q66_04",
});

const prisma = new PrismaClient();
const INPUT_CATALOG = "/Users/princeyadav/Downloads/coding-lang/projects/shilpa-catalog/data/catalog/dmart-74-brands-scraped.json";

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

async function run() {
  const rawData = JSON.parse(fs.readFileSync(INPUT_CATALOG, "utf-8"));
  console.log(`Processing ${rawData.length} raw scraped items...`);

  // Load existing products for 100% deduplication
  const existing = await retryPrisma(() => prisma.product.findMany({ select: { name: true, slug: true } }));
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const existingNormNames = new Set(existing.map((p) => normalizeName(p.name)));

  console.log(`✓ Database currently has ${existingSlugs.size} slugs and ${existingNormNames.size} normalized titles.`);

  let newAdded = 0;
  let skippedDuplicates = 0;

  for (const item of rawData) {
    const title = item.title;
    if (!title || title.length < 3) continue;

    const normName = normalizeName(title);
    let slug = slugify(title);

    // Deduplication Check
    if (existingNormNames.has(normName) || existingSlugs.has(slug)) {
      skippedDuplicates++;
      continue;
    }

    const price = item.dmart_price_inr || item.mrp_inr;
    if (!price || price <= 0) continue;

    const mrp = item.mrp_inr && item.mrp_inr > price ? item.mrp_inr : null;
    const variant = item.variant_size || null;

    // Find category with retry
    let subcatName = item.subcategory || "General";
    let cat = await retryPrisma(() =>
      prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: subcatName, mode: "insensitive" } },
            { slug: slugify(subcatName) }
          ]
        }
      })
    );

    if (!cat) {
      cat = await retryPrisma(() =>
        prisma.category.findFirst({
          where: { parentId: null }
        })
      );
    }

    if (!cat) continue;

    // Brand mapping with retry
    let brandName = item.brand || title.split(" ")[0];
    let brandSlug = slugify(brandName);
    let brand = await retryPrisma(() => prisma.brand.findUnique({ where: { slug: brandSlug } }));
    if (!brand) {
      brand = await retryPrisma(() =>
        prisma.brand.create({
          data: { name: brandName, slug: brandSlug }
        })
      );
    }

    // Cloudinary CDN Upload
    const cdnUrl = await uploadToCloudinary(item.image_url, slug);

    try {
      await retryPrisma(() =>
        prisma.product.create({
          data: {
            name: title,
            slug,
            description: `${title} (${variant || "Standard Retail Pack"}). Genuine retail product. Order on WhatsApp with Shilpa.`,
            price,
            mrp,
            variant,
            imageUrl: cdnUrl || null,
            inStock: item.in_stock ?? true,
            isFeatured: false,
            isArchived: false,
            categoryId: cat.id,
            brandId: brand.id
          }
        })
      );

      existingSlugs.add(slug);
      existingNormNames.add(normName);
      newAdded++;
      console.log(`  + [NEW PRODUCT] Added "${title}" (₹${price}) [${brandName}]`);
    } catch (err: any) {
      if (err.code === "P2002") {
        skippedDuplicates++;
      } else {
        console.error(`  ⨯ Error inserting "${title}":`, err.message);
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 CATALOG INGESTION FINISHED!`);
  console.log(`✓ Total New Retail Products Inserted: ${newAdded}`);
  console.log(`✓ Total Duplicate Items Skipped: ${skippedDuplicates}`);
  console.log(`==================================================`);
}

run().then(() => prisma.$disconnect());
