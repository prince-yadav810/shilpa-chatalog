import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const SUBCATEGORIES = [
  "Baby Diapers",
  "Baby Training Pants",
  "Baby Wipes",
  "Baby Bath & Skincare",
  "Baby Feeding & Nursing",
  "Baby Accessories & Gift Sets",
  "Baby Oral Care & Teethers",
  "Infant Formula & Special Nutrition",
  "Baby Cereals & Weaning Food",
  "Kids Nutrition Drinks",
] as const;

type Subcategory = (typeof SUBCATEGORIES)[number];

const SLUGS: Record<Subcategory, string> = {
  "Baby Diapers": "baby-diapers",
  "Baby Training Pants": "baby-training-pants",
  "Baby Wipes": "baby-wipes",
  "Baby Bath & Skincare": "baby-bath-and-skincare",
  "Baby Feeding & Nursing": "baby-feeding-and-nursing",
  "Baby Accessories & Gift Sets": "baby-accessories-and-gift-sets",
  "Baby Oral Care & Teethers": "baby-oral-care-and-teethers",
  "Infant Formula & Special Nutrition": "infant-formula-and-special-nutrition",
  "Baby Cereals & Weaning Food": "baby-cereals-and-weaning-food",
  "Kids Nutrition Drinks": "kids-nutrition-drinks",
};

const OLD_SUBCATEGORIES = [
  "Baby Food & Formula",
  "Baby Toiletries & Accessories",
  "Diapers & Training Pants",
] as const;

type ExternalMove =
  | "Beauty / Hair Removal & Waxing"
  | "Personal Care / Shaving & Grooming"
  | "Personal Care / Fragrance & Deodorants"
  | "Health & Wellness / Adult Incontinence Care";

function destination(name: string, source: string): Subcategory | ExternalMove {
  if (source === "Diapers & Training Pants") {
    if (/(lifree|wetex).*diaper|adul.*diaper/i.test(name)) return "Health & Wellness / Adult Incontinence Care";
    if (/dermadew.*diaper.*crm/i.test(name)) return "Baby Bath & Skincare";
    if (/wipes/i.test(name)) return "Baby Wipes";
    if (/pant|wonder/i.test(name)) return "Baby Training Pants";
    return "Baby Diapers";
  }

  if (source === "Baby Toiletries & Accessories") {
    if (/vi-john.*hair remov/i.test(name)) return "Beauty / Hair Removal & Waxing";
    if (/vi-john.*foam/i.test(name)) return "Personal Care / Shaving & Grooming";
    if (/st\.john.*de/i.test(name)) return "Personal Care / Fragrance & Deodorants";
    if (/wipes/i.test(name)) return "Baby Wipes";
    if (/bottle|feeder|feeding|\bfdr\b|nipple|soother|sipper|spout|breast|nibbler|bottle brush|feeding cup|teat/i.test(name)) {
      return "Baby Feeding & Nursing";
    }
    if (/teether|teeth|tooth|tongue|oral care/i.test(name)) return "Baby Oral Care & Teethers";
    if (/soap|shampoo|bath|wash|oil|powder|balm|skin care|skincare|puff|detergent|cleanser/i.test(name)) {
      return "Baby Bath & Skincare";
    }
    return "Baby Accessories & Gift Sets";
  }

  if (source === "Baby Food & Formula") {
    if (/cerelac/i.test(name)) return "Baby Cereals & Weaning Food";
    if (/pediasure|aptagrow/i.test(name)) return "Kids Nutrition Drinks";
    return "Infant Formula & Special Nutrition";
  }

  throw new Error(`Unexpected Baby Care source category: ${source}`);
}

async function findTarget(parentName: string, childName: string) {
  const parent = await prisma.category.findFirst({
    where: { name: parentName, parentId: null },
    include: { children: { where: { name: childName } } },
  });
  const child = parent?.children[0];
  if (!child) throw new Error(`Missing destination: ${parentName} → ${childName}`);
  return child;
}

async function main() {
  const babyCare = await prisma.category.findFirst({
    where: { name: "Baby Care", parentId: null },
    include: { children: { include: { products: true } } },
  });
  if (!babyCare) throw new Error("Baby Care category is missing");

  const oldCategories = babyCare.children.filter((category) => OLD_SUBCATEGORIES.includes(category.name as (typeof OLD_SUBCATEGORIES)[number]));
  if (oldCategories.length !== OLD_SUBCATEGORIES.length) {
    throw new Error("One or more original Baby Care subcategories is missing");
  }

  const groups = new Map<string, string[]>();
  const productIds = new Map<string, string[]>();
  for (const name of [...SUBCATEGORIES, "Beauty / Hair Removal & Waxing", "Personal Care / Shaving & Grooming", "Personal Care / Fragrance & Deodorants", "Health & Wellness / Adult Incontinence Care"]) {
    groups.set(name, []);
    productIds.set(name, []);
  }

  for (const category of oldCategories) {
    for (const product of category.products) {
      const target = destination(product.name, category.name);
      groups.get(target)!.push(product.name);
      productIds.get(target)!.push(product.id);
    }
  }

  const expectedTotal = oldCategories.reduce((total, category) => total + category.products.length, 0);
  const classifiedTotal = [...productIds.values()].reduce((total, ids) => total + ids.length, 0);
  if (expectedTotal !== classifiedTotal) throw new Error(`Accounting failed: ${classifiedTotal}/${expectedTotal} products classified`);

  console.log(`Baby Care products to move: ${expectedTotal}`);
  for (const [name, ids] of productIds) console.log(`- ${name}: ${ids.length}`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to make these changes.");
    return;
  }

  const [beautyHairRemoval, personalShaving, personalFragrance, adultIncontinence] = await Promise.all([
    findTarget("Beauty", "Hair Removal & Waxing"),
    findTarget("Personal Care", "Shaving & Grooming"),
    findTarget("Personal Care", "Fragrance & Deodorants"),
    findTarget("Health & Wellness", "Adult Incontinence Care"),
  ]);

  await prisma.$transaction(async (tx) => {
    const destinations = new Map<string, string>();
    for (const [index, name] of SUBCATEGORIES.entries()) {
      const existing = babyCare.children.find((category) => category.name === name);
      const category = existing
        ? await tx.category.update({ where: { id: existing.id }, data: { slug: SLUGS[name], sortOrder: index + 1 } })
        : await tx.category.create({ data: { name, slug: SLUGS[name], parentId: babyCare.id, sortOrder: index + 1 } });
      destinations.set(name, category.id);
    }
    destinations.set("Beauty / Hair Removal & Waxing", beautyHairRemoval.id);
    destinations.set("Personal Care / Shaving & Grooming", personalShaving.id);
    destinations.set("Personal Care / Fragrance & Deodorants", personalFragrance.id);
    destinations.set("Health & Wellness / Adult Incontinence Care", adultIncontinence.id);

    for (const [name, ids] of productIds) {
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: destinations.get(name)! } });
    }
    await tx.category.deleteMany({ where: { id: { in: oldCategories.map((category) => category.id) } } });
  });

  console.log("Baby Care structure updated successfully.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
