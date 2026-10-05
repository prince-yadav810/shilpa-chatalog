import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const BEAUTY_SUBCATEGORIES = [
  "Face Bleach & De-Tan",
  "Hair Removal & Waxing",
  "Lip Care & Lipstick",
  "Eye Makeup",
  "Hair Styling",
  "Facial Skincare & Sun Protection",
  "Face Makeup, Nails & Beauty Tools",
] as const;

const MISPLACED_PRODUCTS = [
  "APSARA WAX CRAYONS 1PKT",
  "KIWI BLACK WAX LIQUID 75ML",
  "KIWI BROWN WAX LIQUID 85ML",
] as const;

type BeautySubcategory = (typeof BEAUTY_SUBCATEGORIES)[number];

const BEAUTY_SLUGS: Record<BeautySubcategory, string> = {
  "Face Bleach & De-Tan": "face-bleach-and-de-tan",
  "Hair Removal & Waxing": "hair-removal-and-waxing",
  "Lip Care & Lipstick": "lip-care-and-lipstick",
  "Eye Makeup": "eye-makeup",
  "Hair Styling": "hair-styling",
  "Facial Skincare & Sun Protection": "facial-skincare-and-sun-protection",
  "Face Makeup, Nails & Beauty Tools": "face-makeup-nails-and-beauty-tools",
};

function beautyDestination(name: string): BeautySubcategory {
  // Check these before the generic "wax" rule: styling waxes are not body wax.
  if (/(gatsby|setwet|urban yog|^gat wax)/i.test(name)) return "Hair Styling";
  if (/(bleach|de-?tan|h\.r\.c|hrc|fem daimond)/i.test(name)) return "Face Bleach & De-Tan";
  if (/(veet|anne french|wax|razor|hair removal)/i.test(name)) {
    return "Hair Removal & Waxing";
  }
  if (/(lip balm|baba?ylips|baby lip|lip love|lip care|lipstick)/i.test(name)) return "Lip Care & Lipstick";
  if (/(kajal|kohl|liner|mascara)/i.test(name)) return "Eye Makeup";
  if (/(compact|founda|\bcc\b|\bcom\b|pan-cake|makeup kit|makeup tool|facial roller|black head remover|9 to5 lumi lit)/i.test(name)) {
    return "Face Makeup, Nails & Beauty Tools";
  }
  if (/nail/i.test(name)) return "Face Makeup, Nails & Beauty Tools";
  if (/(sun|sheet mask|face wash|f\.wash|day cr|serm|blush&glow|brush&glow|perf\.radi|perf rad)/i.test(name)) {
    return "Facial Skincare & Sun Protection";
  }

  throw new Error(`No Beauty destination matched: ${name}`);
}

async function main() {
  const [beauty, stationery, household] = await Promise.all([
    prisma.category.findFirst({
      where: { name: "Beauty", parentId: null },
      // Include archived products as well, otherwise the old category cannot be
      // removed after its visible products have moved.
      include: { children: { include: { products: true } } },
    }),
    prisma.category.findFirst({ where: { name: "Stationery", parentId: null }, include: { children: true } }),
    prisma.category.findFirst({ where: { name: "Household", parentId: null }, include: { children: true } }),
  ]);

  if (!beauty || !stationery || !household) throw new Error("Beauty, Stationery, or Household is missing");
  const oldBeauty = beauty.children.find((category) => category.name === "Makeup & Hair Removal");
  const stationeryTarget = stationery.children.find((category) => category.name === "Writing & School Supplies");
  const shoeCareTarget = household.children.find((category) => category.name === "Shoe Care");
  if (!stationeryTarget || !shoeCareTarget) throw new Error("A required destination subcategory is missing");

  // Safe to re-run after a successful migration: retain the same clean slugs
  // and display order without moving any product a second time.
  if (!oldBeauty) {
    const existing = new Map(beauty.children.map((category) => [category.name, category]));
    if (!BEAUTY_SUBCATEGORIES.every((name) => existing.has(name))) {
      throw new Error("The old Beauty category is missing but the new structure is incomplete");
    }
    if (apply) {
      await prisma.$transaction(BEAUTY_SUBCATEGORIES.map((name, index) =>
        prisma.category.update({ where: { id: existing.get(name)!.id }, data: { slug: BEAUTY_SLUGS[name], sortOrder: index + 1 } }),
      ));
      console.log("Beauty structure already exists; slugs and order confirmed.");
    } else {
      console.log("Beauty structure already exists. Re-run with --apply to confirm slugs and order.");
    }
    return;
  }

  // These three currently sit in Beauty, but belong in Stationery / Shoe Care.
  const beautyProducts = oldBeauty.products.filter((product) => !MISPLACED_PRODUCTS.includes(product.name as (typeof MISPLACED_PRODUCTS)[number]));
  const grouped = new Map<BeautySubcategory, string[]>();
  for (const name of BEAUTY_SUBCATEGORIES) grouped.set(name, []);
  for (const product of beautyProducts) grouped.get(beautyDestination(product.name))!.push(product.id);

  const misplaced = await prisma.product.findMany({
    where: { name: { in: [...MISPLACED_PRODUCTS] }, isArchived: false },
    select: { id: true, name: true, categoryId: true },
  });
  if (misplaced.length !== 3) throw new Error(`Expected 3 misplaced products, found ${misplaced.length}`);

  console.log(`Beauty products to move: ${beautyProducts.length}`);
  for (const [name, ids] of grouped) console.log(`- ${name}: ${ids.length}`);
  console.log("- Stationery → Writing & School Supplies: Apsara Wax Crayons");
  console.log("- Household → Shoe Care: 2 Kiwi wax liquids");

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to make these changes.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const destinations = new Map<string, string>();
    for (const [index, name] of BEAUTY_SUBCATEGORIES.entries()) {
      const existing = beauty.children.find((category) => category.name === name);
      const category = existing
        ? await tx.category.update({ where: { id: existing.id }, data: { slug: BEAUTY_SLUGS[name], sortOrder: index + 1 } })
        : await tx.category.create({
            data: { name, slug: BEAUTY_SLUGS[name], parentId: beauty.id, sortOrder: index + 1 },
          });
      destinations.set(name, category.id);
    }

    for (const [name, ids] of grouped) {
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: destinations.get(name)! } });
    }

    const apsara = misplaced.find((product) => product.name === "APSARA WAX CRAYONS 1PKT")!;
    await tx.product.update({ where: { id: apsara.id }, data: { categoryId: stationeryTarget.id } });
    await tx.product.updateMany({
      where: { id: { in: misplaced.filter((product) => product.name.startsWith("KIWI")).map((product) => product.id) } },
      data: { categoryId: shoeCareTarget.id },
    });

    await tx.category.delete({ where: { id: oldBeauty.id } });
  });

  console.log("Beauty structure updated successfully.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
