import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const SUBCATEGORIES = [
  "Adult Dog Food",
  "Puppy Food",
  "Dog Treats & Dental Care",
  "Adult Cat Food",
  "Kitten Food",
] as const;

type Subcategory = (typeof SUBCATEGORIES)[number];

const SLUGS: Record<Subcategory, string> = {
  "Adult Dog Food": "adult-dog-food",
  "Puppy Food": "puppy-food",
  "Dog Treats & Dental Care": "dog-treats-and-dental-care",
  "Adult Cat Food": "adult-cat-food",
  "Kitten Food": "kitten-food",
};

function destination(name: string): Subcategory {
  if (/pedigree/i.test(name)) {
    if (/denta\s*stix/i.test(name)) return "Dog Treats & Dental Care";
    if (/puppy/i.test(name)) return "Puppy Food";
    return "Adult Dog Food";
  }
  if (/kitten|\bjr\b|2-12|2\/12/i.test(name)) return "Kitten Food";
  return "Adult Cat Food";
}

async function main() {
  const petCare = await prisma.category.findFirst({
    where: { name: "Pet Care", parentId: null },
    include: { children: { include: { products: true } } },
  });
  if (!petCare) throw new Error("Pet Care category is missing");

  const oldCategory = petCare.children.find((category) => category.name === "Pet Food & Treats");
  if (!oldCategory) throw new Error("The original Pet Food & Treats category is missing");

  const groups = new Map<Subcategory, string[]>();
  for (const name of SUBCATEGORIES) groups.set(name, []);
  for (const product of oldCategory.products) groups.get(destination(product.name))!.push(product.id);

  const classifiedTotal = [...groups.values()].reduce((total, ids) => total + ids.length, 0);
  if (classifiedTotal !== oldCategory.products.length) {
    throw new Error(`Accounting failed: ${classifiedTotal}/${oldCategory.products.length} products classified`);
  }

  console.log(`Pet Care products to move: ${oldCategory.products.length}`);
  for (const [name, ids] of groups) console.log(`- ${name}: ${ids.length}`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to make these changes.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const targets = new Map<Subcategory, string>();
    for (const [index, name] of SUBCATEGORIES.entries()) {
      const existing = petCare.children.find((category) => category.name === name);
      const category = existing
        ? await tx.category.update({ where: { id: existing.id }, data: { slug: SLUGS[name], sortOrder: index + 1 } })
        : await tx.category.create({ data: { name, slug: SLUGS[name], parentId: petCare.id, sortOrder: index + 1 } });
      targets.set(name, category.id);
    }
    for (const [name, ids] of groups) {
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: targets.get(name)! } });
    }
    await tx.category.delete({ where: { id: oldCategory.id } });
  });

  console.log("Pet Care structure updated successfully.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
