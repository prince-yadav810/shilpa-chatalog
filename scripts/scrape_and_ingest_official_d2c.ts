import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "glviggky",
  api_key: process.env.CLOUDINARY_API_KEY || "187877688226462",
  api_secret: process.env.CLOUDINARY_API_SECRET || "27yZf7XfTlhU2xpxbV2b7q66_04",
});

const prisma = new PrismaClient();

const D2C_STORES = [
  { name: "Mamaearth", domain: "mamaearth.in", defaultCategory: "skin-care", defaultSubcat: "face-wash-and-cleansers" },
  { name: "Minimalist", domain: "beminimalist.co", defaultCategory: "skin-care", defaultSubcat: "face-serums-and-toners" },
  { name: "Pilgrim", domain: "discoverpilgrim.com", defaultCategory: "skin-care", defaultSubcat: "face-serums-and-toners" },
  { name: "Foxtale", domain: "foxtale.in", defaultCategory: "skin-care", defaultSubcat: "face-serums-and-toners" },
  { name: "Dot & Key", domain: "dotandkey.com", defaultCategory: "skin-care", defaultSubcat: "face-serums-and-toners" },
  { name: "The Derma Co", domain: "thedermaco.com", defaultCategory: "skin-care", defaultSubcat: "face-serums-and-toners" },
  { name: "Lotus Herbals", domain: "www.lotusherbals.com", defaultCategory: "skin-care", defaultSubcat: "sunscreen" },
  { name: "Friends Diapers", domain: "friendsdiaper.in", defaultCategory: "personal-care-and-beauty", defaultSubcat: "adult-diapers" },
  { name: "Wishcare", domain: "www.mywishcare.com", defaultCategory: "personal-care-and-beauty", defaultSubcat: "hair-oil" },
  { name: "Beardo", domain: "www.beardo.in", defaultCategory: "personal-care-and-beauty", defaultSubcat: "shaving-foam" },
  { name: "Plum", domain: "plumgoodness.com", defaultCategory: "skin-care", defaultSubcat: "face-wash-and-cleansers" },
  { name: "mCaffeine", domain: "www.mcaffeine.com", defaultCategory: "skin-care", defaultSubcat: "body-lotions-and-scrubs" },
  { name: "Aqualogica", domain: "aqualogica.in", defaultCategory: "skin-care", defaultSubcat: "sunscreen" },
  { name: "Hyphen", domain: "letshyphen.com", defaultCategory: "skin-care", defaultSubcat: "face-moisturizers-and-creams" },
  { name: "Joy Personal Care", domain: "joypersonalcare.com", defaultCategory: "skin-care", defaultSubcat: "body-lotions-and-scrubs" },
  { name: "Lakme", domain: "lakmeindia.com", defaultCategory: "skin-care", defaultSubcat: "face-wash-and-cleansers" },
  { name: "Biotique", domain: "www.biotique.com", defaultCategory: "skin-care", defaultSubcat: "face-wash-and-cleansers" },
  { name: "Khadi Natural", domain: "www.khadinatural.com", defaultCategory: "personal-care-and-beauty", defaultSubcat: "soaps" },
  { name: "Re'equil", domain: "www.reequil.com", defaultCategory: "skin-care", defaultSubcat: "sunscreen" },
  { name: "Simple", domain: "simpleskincare.in", defaultCategory: "skin-care", defaultSubcat: "face-wash-and-cleansers" }
];

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

async function fetchShopifyProducts(domain: string): Promise<any[]> {
  try {
    const res = await fetch(`https://${domain}/products.json?limit=250`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch (err) {
    console.error(`Error fetching Shopify catalog for ${domain}:`, err);
    return [];
  }
}

async function main() {
  console.log("=== SCRAPING DIRECT OFFICIAL D2C BRAND WEBSITES ===");

  const existingProducts = await retryPrisma(() =>
    prisma.product.findMany({ select: { name: true, slug: true } })
  );
  const existingSlugs = new Set(existingProducts.map((p) => p.slug));
  const existingNormNames = new Set(existingProducts.map((p) => normalizeName(p.name)));

  console.log(`✓ Loaded ${existingSlugs.size} existing product slugs and ${existingNormNames.size} normalized titles from database.`);

  let grandTotalAdded = 0;
  let grandTotalSkipped = 0;

  for (const store of D2C_STORES) {
    console.log(`\n🌐 Fetching Official D2C Catalog for "${store.name}" (${store.domain})...`);
    const rawProducts = await fetchShopifyProducts(store.domain);
    console.log(`✓ Retried ${rawProducts.length} official items from ${store.domain}`);

    if (rawProducts.length === 0) continue;

    // Ensure Brand Record
    const brandSlug = slugify(store.name);
    let brand = await retryPrisma(() => prisma.brand.findUnique({ where: { slug: brandSlug } }));
    if (!brand) {
      brand = await retryPrisma(() =>
        prisma.brand.create({
          data: { name: store.name, slug: brandSlug }
        })
      );
      console.log(`+ Created Brand "${store.name}"`);
    }

    // Ensure Category Record
    let category = await retryPrisma(() =>
      prisma.category.findUnique({ where: { slug: store.defaultSubcat } })
    );
    if (!category) {
      category = await retryPrisma(() =>
        prisma.category.findUnique({ where: { slug: store.defaultCategory } })
      );
    }
    if (!category) {
      category = await retryPrisma(() => prisma.category.findFirst({ where: { parentId: null } }));
    }
    if (!category) continue;

    let storeAdded = 0;
    let storeSkipped = 0;

    for (const prod of rawProducts) {
      const rawTitle = prod.title;
      if (!rawTitle || rawTitle.length < 3) continue;

      const normName = normalizeName(rawTitle);
      const slug = slugify(`${store.name}-${rawTitle}`);

      // Strict Deduplication Check
      if (existingNormNames.has(normName) || existingSlugs.has(slug) || existingSlugs.has(slugify(rawTitle))) {
        storeSkipped++;
        continue;
      }

      const variantObj = prod.variants && prod.variants[0];
      const price = variantObj ? parseFloat(variantObj.price) : 0;
      if (price <= 0) continue;

      const comparePrice = variantObj && variantObj.compare_at_price ? parseFloat(variantObj.compare_at_price) : null;
      const mrp = comparePrice && comparePrice > price ? comparePrice : null;
      const variantTitle = variantObj && variantObj.title !== "Default Title" ? variantObj.title : null;

      const imageObj = prod.images && prod.images[0];
      const imageUrl = imageObj ? imageObj.src : null;
      if (!imageUrl) continue;

      // Upload to Cloudinary CDN
      const cdnUrl = await uploadToCloudinary(imageUrl, slug);

      try {
        await retryPrisma(() =>
          prisma.product.create({
            data: {
              name: `${store.name} ${rawTitle}`,
              slug,
              description: prod.body_html
                ? prod.body_html.replace(/<[^>]*>?/gm, "").slice(0, 300)
                : `${rawTitle} by ${store.name}. Official D2C stock at Shilpa.`,
              price,
              mrp,
              variant: variantTitle,
              imageUrl: cdnUrl,
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
        storeAdded++;
        grandTotalAdded++;
        console.log(`  + [NEW OFFICIAL D2C] ${store.name} ${rawTitle} (₹${price})`);
      } catch (err: any) {
        if (err.code === "P2002") {
          storeSkipped++;
          grandTotalSkipped++;
        } else {
          console.error(`  ⨯ Error adding "${rawTitle}":`, err.message);
        }
      }
    }

    console.log(`✓ ${store.name}: ${storeAdded} new official items added, ${storeSkipped} duplicates skipped.`);
    grandTotalSkipped += storeSkipped;
  }

  console.log(`\n==================================================`);
  console.log(`🎉 OFFICIAL D2C WEBSITE INGESTION FINISHED!`);
  console.log(`✓ Total New Official Products Added: ${grandTotalAdded}`);
  console.log(`✓ Total Duplicates Skipped: ${grandTotalSkipped}`);
  console.log(`==================================================`);
}

main().then(() => prisma.$disconnect());
