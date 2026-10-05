import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const PARENTS = [
  ["Pantry, Dairy & Cooking", "pantry-dairy-and-cooking"],
  ["Snacks, Bakery & Sweets", "snacks-bakery-and-sweets"],
  ["Drinks, Ice Cream & Frozen", "drinks-ice-cream-and-frozen"],
] as const;

const REPARENT: Record<string, string> = {
  "Breakfast Cereals & Nutrition Drinks": "Pantry, Dairy & Cooking",
  "Cooking Oils & Ghee": "Pantry, Dairy & Cooking",
  "Dairy & Dairy Alternatives": "Pantry, Dairy & Cooking",
  "Digestive & Traditional Wellness Foods": "Pantry, Dairy & Cooking",
  "Instant Food & Noodles": "Pantry, Dairy & Cooking",
  "Spreads, Sauces & Condiments": "Pantry, Dairy & Cooking",
  "Staples & Cooking Ingredients": "Pantry, Dairy & Cooking",
  "Tea, Coffee & Drink Mixes": "Pantry, Dairy & Cooking",
  "Chocolates & Confectionery": "Snacks, Bakery & Sweets",
  "Dry Fruits & Traditional Sweets": "Snacks, Bakery & Sweets",
  "Healthy Snacks, Seeds & Mukhwas": "Snacks, Bakery & Sweets",
  "Savoury Snacks & Namkeen": "Snacks, Bakery & Sweets",
  "Beverages": "Drinks, Ice Cream & Frozen",
  "Energy & Glucose Drinks": "Drinks, Ice Cream & Frozen",
  "Ice Cream & Frozen Desserts": "Drinks, Ice Cream & Frozen",
};

const MERGED_SOURCES = ["Bakery, Biscuits & Cakes", "Biscuits, Cookies & Wafers"] as const;
const READY_TO_EAT = "Ready-to-Eat Snacks & Bakery";

async function main() {
  const food = await prisma.category.findFirst({
    where: { name: "Food & Beverages", parentId: null },
    include: { children: { include: { products: true } } },
  });
  if (!food) throw new Error("Food & Beverages category is missing");

  const childByName = new Map(food.children.map((category) => [category.name, category]));
  const required = [...Object.keys(REPARENT), ...MERGED_SOURCES, READY_TO_EAT];
  for (const name of required) if (!childByName.has(name)) throw new Error(`Missing Food & Beverages subcategory: ${name}`);

  const mergedProducts = MERGED_SOURCES.flatMap((name) => childByName.get(name)!.products);
  console.log(`Food records to merge into Biscuits, Cookies & Bakery: ${mergedProducts.length}`);
  for (const [name, parent] of Object.entries(REPARENT)) console.log(`- ${name} → ${parent}`);
  console.log(`- ${READY_TO_EAT} → Snacks, Bakery & Sweets as Ready-to-Eat Snacks`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to make these changes.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const parentIds = new Map<string, string>();
    for (const [index, [name, slug]] of PARENTS.entries()) {
      const existing = await tx.category.findFirst({ where: { name, parentId: null } });
      const parent = existing ?? await tx.category.create({ data: { name, slug, sortOrder: 30 + index } });
      parentIds.set(name, parent.id);
    }

    const merged = await tx.category.create({
      data: {
        name: "Biscuits, Cookies & Bakery",
        slug: "biscuits-cookies-and-bakery",
        parentId: parentIds.get("Snacks, Bakery & Sweets")!,
        sortOrder: 1,
      },
    });
    await tx.product.updateMany({ where: { id: { in: mergedProducts.map((product) => product.id) } }, data: { categoryId: merged.id } });

    for (const [name, parentName] of Object.entries(REPARENT)) {
      await tx.category.update({
        where: { id: childByName.get(name)!.id },
        data: { parentId: parentIds.get(parentName)! },
      });
    }
    await tx.category.update({
      where: { id: childByName.get(READY_TO_EAT)!.id },
      data: {
        name: "Ready-to-Eat Snacks",
        slug: "ready-to-eat-snacks",
        parentId: parentIds.get("Snacks, Bakery & Sweets")!,
      },
    });
    await tx.category.deleteMany({ where: { id: { in: MERGED_SOURCES.map((name) => childByName.get(name)!.id) } } });
    await tx.category.delete({ where: { id: food.id } });
  }, { timeout: 60000 });

  console.log("Food & Beverages has been replaced by the three new main categories.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
