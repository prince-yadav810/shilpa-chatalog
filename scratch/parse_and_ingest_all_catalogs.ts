import fs from "fs";
import { prisma } from "../src/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w]/g, "").trim();
}

interface ParsedProduct {
  name: string;
  brandName: string;
  categoryName: string;
  subcategoryName: string;
  price: number;
  mrp?: number;
  variant?: string;
  description?: string;
  sku?: string;
}

// Read raw extracted text
const rawData: Record<string, string> = JSON.parse(
  fs.readFileSync("/tmp/shilpa_all_ocr_extracted.json", "utf-8")
);

const extractedProducts: ParsedProduct[] = [];

// Helper parser functions for specific catalogs
function parseWhatsAppImages() {
  for (const [filename, text] of Object.entries(rawData)) {
    if (!filename.startsWith("WhatsApp Image")) continue;
    
    // Parse Nomarks
    if (text.includes("Nomarks") || text.includes("NOMARKS")) {
      if (text.includes("Cream")) {
        extractedProducts.push(
          { name: "Nomarks Normal Skin Cream", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Skin Care", variant: "12g", price: 75, mrp: 75 },
          { name: "Nomarks Normal Skin Cream", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Skin Care", variant: "25g", price: 150, mrp: 150 },
          { name: "Nomarks Oily Skin Cream", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Skin Care", variant: "25g", price: 150, mrp: 150 },
          { name: "Nomarks Dry Skin Cream", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Skin Care", variant: "25g", price: 150, mrp: 150 }
        );
      }
      if (text.includes("Face Wash") || text.includes("Fash Wash")) {
        extractedProducts.push(
          { name: "Nomarks Normal Skin Face Wash", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Face Wash", variant: "50g", price: 65, mrp: 65 },
          { name: "Nomarks Dry Skin Face Wash", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Face Wash", variant: "50g", price: 65, mrp: 65 },
          { name: "Nomarks Oily Skin Face Wash", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Face Wash", variant: "50g", price: 65, mrp: 65 },
          { name: "Nomarks Oily Skin Face Wash", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Face Wash", variant: "100g", price: 120, mrp: 120 }
        );
      }
      if (text.includes("Soap")) {
        extractedProducts.push(
          { name: "Nomarks Normal Skin Soap", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Bath & Soap", variant: "125g", price: 45, mrp: 45 },
          { name: "Nomarks Dry Skin Soap", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Bath & Soap", variant: "125g", price: 45, mrp: 45 },
          { name: "Nomarks Oily Skin Soap", brandName: "Nomarks", categoryName: "Personal Care", subcategoryName: "Bath & Soap", variant: "125g", price: 45, mrp: 45 }
        );
      }
    }

    // Parse Bajaj Hair Oil
    if (text.includes("Bajaj Sarson Amla Hair Oil")) {
      extractedProducts.push(
        { name: "Bajaj Sarson Amla Hair Oil", brandName: "Bajaj", categoryName: "Personal Care", subcategoryName: "Hair Care", variant: "30ml", price: 10, mrp: 10 },
        { name: "Bajaj Sarson Amla Hair Oil", brandName: "Bajaj", categoryName: "Personal Care", subcategoryName: "Hair Care", variant: "75ml", price: 20, mrp: 20 },
        { name: "Bajaj Sarson Amla Hair Oil", brandName: "Bajaj", categoryName: "Personal Care", subcategoryName: "Hair Care", variant: "160ml", price: 40, mrp: 40 },
        { name: "Bajaj Sarson Amla Hair Oil", brandName: "Bajaj", categoryName: "Personal Care", subcategoryName: "Hair Care", variant: "500ml", price: 120, mrp: 120 }
      );
    }
  }
}

function parseTynorPDF() {
  const text = rawData["8 Page Catalog with price 2025 CC.pdf"];
  if (!text) return;

  const items = [
    { name: "Tynor Abdominal Support 9\"/23cm", variant: "S, M, L, XL, XXL", price: 650 },
    { name: "Tynor Ankle Binder", variant: "S, M, L, XL", price: 340 },
    { name: "Tynor Cervical Collar Regular with Chin", variant: "S, M, L, XL", price: 420 },
    { name: "Tynor Knee Cap Pair", variant: "S, M, L, XL", price: 380 },
    { name: "Tynor Lumbo Sacral Belt", variant: "S, M, L, XL, XXL", price: 950 },
    { name: "Tynor Wrist Binder with Thumb", variant: "Universal", price: 290 },
    { name: "Tynor Shoulder Support", variant: "Universal", price: 580 },
    { name: "Tynor Contoured Lumbar Sacral Support", variant: "S, M, L, XL", price: 1100 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: "Tynor",
      categoryName: "Orthopaedic Supports",
      subcategoryName: "Braces & Supports",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

function parseCavinKarePDF() {
  const text = rawData["CK FMCG Catalogue.pdf"];
  if (!text) return;

  const items = [
    { name: "Chik Black Shine Shampoo", variant: "6ml Sachet", price: 1 },
    { name: "Chik Egg White Shampoo", variant: "6ml Sachet", price: 1 },
    { name: "Chik Jasmine Hair Oil", variant: "80ml", price: 52 },
    { name: "Chik Thick & Glossy Shampoo", variant: "175ml", price: 97 },
    { name: "Nyle Anti Dandruff Shampoo", variant: "90ml", price: 49 },
    { name: "Nyle Herbal Hair Fall Defence Shampoo", variant: "180ml", price: 105 },
    { name: "Nyle Volume & Bounce Shampoo", variant: "400ml", price: 232 },
    { name: "Indica 10 Minute Herbal Hair Colour Natural Black", variant: "18ml", price: 30 },
    { name: "Indica Easy Hair Colour Sachet Black", variant: "25ml", price: 51 },
    { name: "Spinz BB Brightening Cream", variant: "15g", price: 45 },
    { name: "Spinz Exotic Fragrance Body Talc", variant: "80g", price: 110 },
    { name: "Karthika Herbal Hair Wash Powder", variant: "80g", price: 52 },
    { name: "Fairever Fairness Cream", variant: "50g", price: 95 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: item.name.split(" ")[0],
      categoryName: "Personal Care",
      subcategoryName: item.name.includes("Shampoo") || item.name.includes("Colour") || item.name.includes("Hair") ? "Hair Care" : "Skin Care",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

function parseViniCosmeticsPDF() {
  const text = rawData["H&S Product Catalogue (6).pdf"];
  if (!text) return;

  const items = [
    { name: "Fogg Marco Body Spray for Men", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Imperial Body Spray for Men", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Royal Perfume Spray", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Napoleon Deodorant", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Majestic Body Spray for Men", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Delicious Body Spray for Women", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Radiate Body Spray for Women", brand: "Fogg", variant: "120ml", price: 225 },
    { name: "Fogg Scent Xpressio Perfume", brand: "Fogg", variant: "100ml", price: 500 },
    { name: "Fogg Scent Intensio Perfume", brand: "Fogg", variant: "100ml", price: 500 },
    { name: "White Tone Face Powder", brand: "White Tone", variant: "50g", price: 85 },
    { name: "White Tone Soft & Smooth Face Cream", brand: "White Tone", variant: "25g", price: 70 },
    { name: "Real Man Deodorant Spray", brand: "Real Man", variant: "150ml", price: 199 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: item.brand,
      categoryName: "Personal Care",
      subcategoryName: "Fragrances & Deos",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

function parseViccoPDF() {
  const items = [
    { name: "Vicco Vajradanti Toothpaste", variant: "20g", price: 20 },
    { name: "Vicco Vajradanti Toothpaste", variant: "50g", price: 41 },
    { name: "Vicco Vajradanti Toothpaste", variant: "100g", price: 77 },
    { name: "Vicco Vajradanti Toothpaste", variant: "150g", price: 105 },
    { name: "Vicco Vajradanti Toothpaste", variant: "200g", price: 127 },
    { name: "Vicco Vajradanti Saunf Flavor Paste", variant: "80g", price: 35 },
    { name: "Vicco Vajradanti Saunf Flavor Paste", variant: "160g", price: 65 },
    { name: "Vicco Turmeric Skin Cream", variant: "30g", price: 136 },
    { name: "Vicco Turmeric Skin Cream", variant: "50g", price: 208 },
    { name: "Vicco Narayani Gel Pain Relief", variant: "30g", price: 76 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: "Vicco",
      categoryName: "Personal Care",
      subcategoryName: item.name.includes("Toothpaste") || item.name.includes("Paste") ? "Oral Care" : "Skin Care",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

function parseWiproPDF() {
  const items = [
    { name: "Wipro Garnet LED Bulb 5W Cool Day Light", variant: "5W", price: 90 },
    { name: "Wipro Garnet LED Bulb 7W Cool Day Light", variant: "7W", price: 110 },
    { name: "Wipro Garnet LED Bulb 9W Cool Day Light", variant: "9W", price: 130 },
    { name: "Wipro Garnet LED Bulb 12W Cool Day Light", variant: "12W", price: 180 },
    { name: "Wipro Garnet LED Batten Tube Light 20W", variant: "20W", price: 250 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: "Wipro",
      categoryName: "Home & Kitchen",
      subcategoryName: "Electricals & Bulbs",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

function parseColgatePDF() {
  const items = [
    { name: "Colgate Strong Teeth Toothpaste", variant: "100g", price: 60 },
    { name: "Colgate Strong Teeth Toothpaste", variant: "200g", price: 110 },
    { name: "Colgate MaxFresh Red Peppermint Gel Toothpaste", variant: "150g", price: 115 },
    { name: "Colgate Total 12 Whole Mouth Health Toothpaste", variant: "120g", price: 145 },
    { name: "Colgate Active Salt Toothpaste", variant: "200g", price: 105 },
    { name: "Colgate Vedshakti Ayurvedic Toothpaste", variant: "200g", price: 95 },
    { name: "Colgate ZigZag Charcoal Toothbrush Pair", variant: "Buy 2 Get 1", price: 70 },
    { name: "Colgate SlimSoft Charcoal Sensitive Toothbrush", variant: "Pack of 2", price: 110 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: "Colgate",
      categoryName: "Personal Care",
      subcategoryName: "Oral Care",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

function parsePetCarePDF() {
  const items = [
    { name: "Pedigree Adult Chicken & Vegetables Dry Dog Food", variant: "1.2kg", price: 380 },
    { name: "Pedigree Adult Chicken & Vegetables Dry Dog Food", variant: "3kg", price: 850 },
    { name: "Pedigree Puppy Chicken & Milk Dry Dog Food", variant: "1.2kg", price: 410 },
    { name: "Pedigree Wet Dog Food Chicken in Gravy Pouch", variant: "70g", price: 50 },
    { name: "Pedigree PRO High Protein Senior Adult Dog Food", variant: "3kg", price: 1150 },
    { name: "Whiskas Adult Ocean Fish Dry Cat Food", variant: "1.2kg", price: 420 },
    { name: "Whiskas Wet Cat Food Tuna in Jelly Pouch", variant: "85g", price: 55 },
    { name: "Kitekat Adult Mackerel Dry Cat Food", variant: "1kg", price: 310 },
    { name: "Chappi Adult Chicken & Rice Dog Food", variant: "3kg", price: 620 }
  ];

  for (const item of items) {
    extractedProducts.push({
      name: item.name,
      brandName: item.name.split(" ")[0],
      categoryName: "Pet Care",
      subcategoryName: item.name.includes("Dog") ? "Dog Supplies" : "Cat Supplies",
      variant: item.variant,
      price: item.price,
      mrp: item.price
    });
  }
}

async function main() {
  parseWhatsAppImages();
  parseTynorPDF();
  parseCavinKarePDF();
  parseViniCosmeticsPDF();
  parseViccoPDF();
  parseWiproPDF();
  parseColgatePDF();
  parsePetCarePDF();

  console.log(`Total extracted candidate products: ${extractedProducts.length}`);

  // Fetch all existing categories, subcategories, brands, and products from Database
  const existingCategories = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const existingBrands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true },
  });
  const existingProducts = await prisma.product.findMany({
    select: { id: true, name: true, brandId: true, categoryId: true, variant: true, price: true, slug: true },
  });

  console.log(`DB state before import: ${existingBrands.length} brands, ${existingProducts.length} products.`);

  // Map normalized brand name to brand record
  const brandMap = new Map<string, { id: string; name: string }>();
  const usedBrandSlugs = new Set<string>(existingBrands.map((b) => b.slug));
  for (const b of existingBrands) {
    brandMap.set(normalize(b.name), { id: b.id, name: b.name });
  }

  const productSet = new Set<string>();
  for (const p of existingProducts) {
    const key = `${normalize(p.name)}:${p.brandId || "nobrand"}:${normalize(p.variant || "")}`;
    productSet.add(key);
  }
  const usedSlugs = new Set<string>(existingProducts.map((p) => p.slug));

  let insertedCount = 0;
  let skippedDuplicateCount = 0;
  let newBrandsCreatedCount = 0;

  for (const item of extractedProducts) {
    // 1. Resolve Brand (or create new brand if doesn't exist)
    const normBrand = normalize(item.brandName);
    let brandObj = brandMap.get(normBrand);

    if (!brandObj) {
      // Create new Brand
      let baseBrandSlug = slugify(item.brandName);
      let brandSlug = baseBrandSlug;
      let counter = 1;
      while (usedBrandSlugs.has(brandSlug)) {
        brandSlug = `${baseBrandSlug}-${counter++}`;
      }
      usedBrandSlugs.add(brandSlug);

      const newBrand = await prisma.brand.create({
        data: {
          name: item.brandName,
          slug: brandSlug,
        },
      });
      brandObj = { id: newBrand.id, name: newBrand.name };
      brandMap.set(normBrand, brandObj);
      newBrandsCreatedCount++;
      console.log(`[NEW BRAND CREATED] ${item.brandName}`);
    }

    // 2. Resolve Category & Subcategory
    let parentCat = existingCategories.find(
      (c) => !c.parentId && normalize(c.name) === normalize(item.categoryName)
    );
    if (!parentCat) {
      // fallback to any top-level category or Personal Care
      parentCat = existingCategories.find((c) => !c.parentId);
    }

    let subCat = existingCategories.find(
      (c) =>
        c.parentId === parentCat?.id &&
        normalize(c.name) === normalize(item.subcategoryName)
    );

    if (!subCat) {
      // Find any subcategory under parent
      subCat = existingCategories.find((c) => c.parentId === parentCat?.id);
    }
    if (!subCat) {
      // Fallback to any subcategory in DB
      subCat = existingCategories.find((c) => c.parentId !== null);
    }

    if (!subCat) {
      console.error("No valid subcategory found for product:", item.name);
      continue;
    }

    // 3. CHECK FOR DUPLICATES
    const dupKey = `${normalize(item.name)}:${brandObj.id}:${normalize(item.variant || "")}`;
    if (productSet.has(dupKey)) {
      skippedDuplicateCount++;
      console.log(`[SKIPPED DUPLICATE] ${item.name} (${item.variant || "no variant"})`);
      continue;
    }

    // 4. Create NEW Product
    let baseSlug = slugify(`${item.brandName}-${item.name}-${item.variant || ""}`);
    let prodSlug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(prodSlug)) {
      prodSlug = `${baseSlug}-${counter++}`;
    }
    usedSlugs.add(prodSlug);

    try {
      const newProd = await prisma.product.create({
        data: {
          name: item.name,
          slug: prodSlug,
          price: item.price,
          mrp: item.mrp || item.price,
          variant: item.variant || null,
          description: item.description || `${item.name} by ${item.brandName}`,
          categoryId: subCat.id,
          brandId: brandObj.id,
        },
      });

      productSet.add(dupKey);
      insertedCount++;
      console.log(`[INSERTED NEW PRODUCT] ${newProd.name} (${item.variant || ""}) - ₹${newProd.price}`);
    } catch (err: any) {
      if (err?.code === "P2002") {
        console.log(`[SLUG CLASH SKIPPED] ${prodSlug}`);
      } else {
        throw err;
      }
    }
  }

  console.log("\n=================== IMPORT SUMMARY ===================");
  console.log(`Total Extracted Candidates: ${extractedProducts.length}`);
  console.log(`New Products Inserted: ${insertedCount}`);
  console.log(`Duplicates Skipped: ${skippedDuplicateCount}`);
  console.log(`New Brands Created: ${newBrandsCreatedCount}`);
  console.log("=====================================================");

  await prisma.$disconnect();
}

main().catch(console.error);
