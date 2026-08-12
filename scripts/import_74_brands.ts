import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "glviggky",
  api_key: process.env.CLOUDINARY_API_KEY || "187877688226462",
  api_secret: process.env.CLOUDINARY_API_SECRET || "27yZf7XfTlhU2xpxbV2b7q66_04",
});

const prisma = new PrismaClient();

// 74 Brand / Retail Product Target Lines
const BRAND_TARGETS = [
  { name: "Gillette", categorySlug: "personal-care-and-beauty", subcategorySlug: "razors-and-blades", query: "gillette" },
  { name: "Colgate", categorySlug: "personal-care-and-beauty", subcategorySlug: "toothpaste", query: "colgate" },
  { name: "Godrej", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "godrej" },
  { name: "Britannia", categorySlug: "packaged-foods", subcategorySlug: "biscuits-and-cookies", query: "britannia" },
  { name: "Parle", categorySlug: "packaged-foods", subcategorySlug: "biscuits-and-cookies", query: "parle" },
  { name: "Cadbury", categorySlug: "packaged-foods", subcategorySlug: "chocolates", query: "cadbury" },
  { name: "Nivea", categorySlug: "skin-care", subcategorySlug: "face-moisturizers-and-creams", query: "nivea" },
  { name: "VLCC", categorySlug: "skin-care", subcategorySlug: "facial-kits", query: "vlcc" },
  { name: "Mamaearth", categorySlug: "skin-care", subcategorySlug: "face-wash-and-cleansers", query: "mamaearth" },
  { name: "Pilgrim", categorySlug: "skin-care", subcategorySlug: "face-serums-and-toners", query: "pilgrim" },
  { name: "Garnier", categorySlug: "skin-care", subcategorySlug: "face-wash-and-cleansers", query: "garnier" },
  { name: "Minimalist", categorySlug: "skin-care", subcategorySlug: "face-serums-and-toners", query: "minimalist" },
  { name: "Johnson & Johnson", categorySlug: "baby-care", subcategorySlug: "baby-skin-and-hair-care", query: "johnson" },
  { name: "Foxtale", categorySlug: "skin-care", subcategorySlug: "face-serums-and-toners", query: "foxtale" },
  { name: "Dr. Rashel", categorySlug: "skin-care", subcategorySlug: "face-moisturizers-and-creams", query: "rashel" },
  { name: "Joy", categorySlug: "skin-care", subcategorySlug: "body-lotions-and-scrubs", query: "joy" },
  { name: "Ghar Soap", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "ghar soap" },
  { name: "Himalaya", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "himalaya" },
  { name: "Lakme", categorySlug: "skin-care", subcategorySlug: "face-wash-and-cleansers", query: "lakme" },
  { name: "Dot & Key", categorySlug: "skin-care", subcategorySlug: "face-serums-and-toners", query: "dot key" },
  { name: "Vaseline", categorySlug: "skin-care", subcategorySlug: "body-lotions-and-scrubs", query: "vaseline" },
  { name: "Clean & Clear", categorySlug: "skin-care", subcategorySlug: "face-wash-and-cleansers", query: "clean clear" },
  { name: "Set Wet", categorySlug: "personal-care-and-beauty", subcategorySlug: "hair-oil", query: "set wet" },
  { name: "Lotus", categorySlug: "skin-care", subcategorySlug: "sunscreen", query: "lotus" },
  { name: "Mysore Sandal", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "mysore sandal" },
  { name: "Pond's", categorySlug: "skin-care", subcategorySlug: "face-moisturizers-and-creams", query: "ponds" },
  { name: "Lux", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "lux soap" },
  { name: "Glow & Lovely", categorySlug: "skin-care", subcategorySlug: "face-moisturizers-and-creams", query: "glow lovely" },
  { name: "Fair & Handsome", categorySlug: "skin-care", subcategorySlug: "face-moisturizers-and-creams", query: "fair handsome" },
  { name: "Dove", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "dove" },
  { name: "Vicco", categorySlug: "personal-care-and-beauty", subcategorySlug: "toothpaste", query: "vicco" },
  { name: "Head & Shoulders", categorySlug: "personal-care-and-beauty", subcategorySlug: "shampoos", query: "head shoulders" },
  { name: "Clinic Plus", categorySlug: "personal-care-and-beauty", subcategorySlug: "shampoos", query: "clinic plus" },
  { name: "Indulekha", categorySlug: "personal-care-and-beauty", subcategorySlug: "hair-oil", query: "indulekha" },
  { name: "L'Oreal", categorySlug: "personal-care-and-beauty", subcategorySlug: "shampoos", query: "loreal" },
  { name: "Kesh King", categorySlug: "personal-care-and-beauty", subcategorySlug: "hair-oil", query: "kesh king" },
  { name: "Pantene", categorySlug: "personal-care-and-beauty", subcategorySlug: "shampoos", query: "pantene" },
  { name: "Sunsilk", categorySlug: "personal-care-and-beauty", subcategorySlug: "shampoos", query: "sunsilk" },
  { name: "Tresemme", categorySlug: "personal-care-and-beauty", subcategorySlug: "shampoos", query: "tresemme" },
  { name: "Sugar Free", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "sugar free" },
  { name: "Lipton", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "lipton" },
  { name: "Parachute", categorySlug: "personal-care-and-beauty", subcategorySlug: "hair-oil", query: "parachute" },
  { name: "Whisper", categorySlug: "personal-care-and-beauty", subcategorySlug: "sanitary-napkins", query: "whisper" },
  { name: "Stayfree", categorySlug: "personal-care-and-beauty", subcategorySlug: "sanitary-napkins", query: "stayfree" },
  { name: "MamyPoko", categorySlug: "baby-care", subcategorySlug: "diapers-and-wipes", query: "mamypoko" },
  { name: "Pampers", categorySlug: "baby-care", subcategorySlug: "diapers-and-wipes", query: "pampers" },
  { name: "Patanjali", categorySlug: "personal-care-and-beauty", subcategorySlug: "toothpaste", query: "patanjali" },
  { name: "Vasomol", categorySlug: "personal-care-and-beauty", subcategorySlug: "hair-colour", query: "vasomol" },
  { name: "Sanjeevani Nachni", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "nachni" },
  { name: "Pushkaraj Nachni", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "nachni" },
  { name: "Fogg", categorySlug: "personal-care-and-beauty", subcategorySlug: "talcum-powder", query: "fogg" },
  { name: "Park Avenue", categorySlug: "personal-care-and-beauty", subcategorySlug: "shaving-foam", query: "park avenue" },
  { name: "Bournvita", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "bournvita" },
  { name: "Horlicks", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "horlicks" },
  { name: "Dettol", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "dettol" },
  { name: "Everyuth", categorySlug: "skin-care", subcategorySlug: "face-scrubs-and-masks", query: "everyuth" },
  { name: "Pears", categorySlug: "personal-care-and-beauty", subcategorySlug: "soaps", query: "pears" },
  { name: "Sensodyne", categorySlug: "personal-care-and-beauty", subcategorySlug: "toothpaste", query: "sensodyne" },
  { name: "Pepsodent", categorySlug: "personal-care-and-beauty", subcategorySlug: "toothpaste", query: "pepsodent" },
  { name: "Toothbrush", categorySlug: "personal-care-and-beauty", subcategorySlug: "toothpaste", query: "toothbrush" },
  { name: "Tissue Paper", categorySlug: "home-and-kitchen", subcategorySlug: "fresheners-and-repellents", query: "tissue paper" },
  { name: "Himalaya Baby", categorySlug: "baby-care", subcategorySlug: "baby-skin-and-hair-care", query: "himalaya baby" },
  { name: "Dabur", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "dabur" },
  { name: "Baidyanath", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "baidyanath" },
  { name: "Sandu Ayurvedic", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "sandu" },
  { name: "Lotus Biscoff", categorySlug: "packaged-foods", subcategorySlug: "biscuits-and-cookies", query: "biscoff" },
  { name: "Whiskas", categorySlug: "home-and-kitchen", subcategorySlug: "pet-supplies", query: "whiskas" },
  { name: "Pedigree", categorySlug: "home-and-kitchen", subcategorySlug: "pet-supplies", query: "pedigree" },
  { name: "Derma Co", categorySlug: "skin-care", subcategorySlug: "face-serums-and-toners", query: "derma co" },
  { name: "Bisleri", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "bisleri" },
  { name: "ORS Liquid", categorySlug: "packaged-foods", subcategorySlug: "health-food", query: "ors" },
  { name: "Adult Diaper", categorySlug: "personal-care-and-beauty", subcategorySlug: "adult-diapers", query: "adult diaper" },
  { name: "Little Joys", categorySlug: "baby-care", subcategorySlug: "baby-food", query: "little joys" },
  { name: "First Aid & Health", categorySlug: "orthopaedic-supports", subcategorySlug: "ankle-and-foot-supports", query: "thermometer bandage" }
];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function searchDMart(query: string): Promise<any[]> {
  const url = `https://www.dmart.in/api/v2/search?searchTerm=${encodeURIComponent(query)}&storeId=10151`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.dmart.in/"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch (err) {
    console.error(`Fetch error for search query "${query}":`, err);
    return [];
  }
}

async function uploadToCloudinary(imageUrl: string, publicId: string): Promise<string> {
  try {
    const res = await cloudinary.uploader.upload(imageUrl, {
      folder: "shilpa/products",
      public_id: publicId,
      overwrite: true
    });
    return res.secure_url;
  } catch (err) {
    console.warn(`Cloudinary upload failed for ${publicId}, using direct URL fallback.`);
    return imageUrl;
  }
}

async function runImport() {
  console.log("=== STARTING RETAIL CATALOG INGESTION FOR 74 BRAND LINES ===");

  // Load existing products for 100% deduplication
  const existingProducts = await prisma.product.findMany({
    select: { name: true, slug: true }
  });
  const existingSlugs = new Set(existingProducts.map((p) => p.slug));
  const existingNormNames = new Set(existingProducts.map((p) => normalizeName(p.name)));

  console.log(`✓ Loaded ${existingSlugs.size} existing product slugs and ${existingNormNames.size} normalized names from database.`);

  let totalNewAdded = 0;
  let totalSkippedDuplicates = 0;

  for (const target of BRAND_TARGETS) {
    console.log(`\n🔍 Searching DMart for "${target.name}" (query: "${target.query}")...`);
    const rawProducts = await searchDMart(target.query);
    console.log(`Found ${rawProducts.length} raw search items for "${target.name}". Processing...`);

    // Ensure category exists
    let category = await prisma.category.findUnique({ where: { slug: target.subcategorySlug } });
    if (!category) {
      category = await prisma.category.findUnique({ where: { slug: target.categorySlug } });
    }
    if (!category) {
      console.warn(`⚠️ Category "${target.categorySlug}" / "${target.subcategorySlug}" not found. Skipping target ${target.name}.`);
      continue;
    }

    // Ensure brand exists
    let brand = await prisma.brand.findUnique({ where: { slug: generateSlug(target.name) } });
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: target.name,
          slug: generateSlug(target.name)
        }
      });
      console.log(`✓ Created new Brand "${brand.name}"`);
    }

    for (const item of rawProducts) {
      const name = item.name || item.title;
      if (!name) continue;

      const normName = normalizeName(name);
      let slug = generateSlug(name);

      // Check duplicates
      if (existingNormNames.has(normName) || existingSlugs.has(slug)) {
        totalSkippedDuplicates++;
        continue;
      }

      const mrp = parseFloat(item.mrp || item.price || "0");
      const price = parseFloat(item.price || item.mrp || "0");
      if (price <= 0) continue;

      const variant = item.variant || item.size || null;
      let rawImg = item.imageUrl || item.image || (item.images && item.images[0]);
      if (rawImg && rawImg.startsWith("//")) rawImg = "https:" + rawImg;

      if (!rawImg) continue;

      // Upload image to Cloudinary
      const cdnUrl = await uploadToCloudinary(rawImg, slug);

      // Create product in PostgreSQL
      try {
        await prisma.product.create({
          data: {
            name,
            slug,
            description: item.description || `${name} (${variant || "Standard Retail Pack"}). Authentic retail stock at Shilpa.`,
            price,
            mrp: mrp > price ? mrp : null,
            variant,
            imageUrl: cdnUrl,
            inStock: true,
            isFeatured: false,
            isArchived: false,
            categoryId: category.id,
            brandId: brand.id
          }
        });

        existingSlugs.add(slug);
        existingNormNames.add(normName);
        totalNewAdded++;
        console.log(`  + [NEW RETAIL PRODUCT] Added "${name}" (₹${price})`);
      } catch (err: any) {
        if (err.code === "P2002") {
          totalSkippedDuplicates++;
        } else {
          console.error(`  ⨯ Error inserting "${name}":`, err.message);
        }
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 INGESTION COMPLETE!`);
  console.log(`✓ Total New Retail Products Added: ${totalNewAdded}`);
  console.log(`✓ Total Duplicate Products Skipped: ${totalSkippedDuplicates}`);
  console.log(`==================================================`);
}

runImport().then(() => prisma.$disconnect());
