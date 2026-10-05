import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const MIXED_SOURCES = ["Hair & Skin Care", "Hair Styling & Grooming", "Skin Care"] as const;
const REPARENTED_SOURCES: Record<string, string> = {
  "Bath & Hair Care": "Hair Care & Grooming",
  "Hair Care & Hair Colour": "Hair Care & Grooming",
  "Shaving & Grooming": "Hair Care & Grooming",
  "Bath & Body Care": "Bath, Body & Hygiene",
  "Fragrance & Deodorants": "Bath, Body & Hygiene",
  "Hand Hygiene": "Bath, Body & Hygiene",
  "Oral Care": "Bath, Body & Hygiene",
  "Feminine Hygiene": "Feminine & Intimate Care",
  "Sexual Wellness": "Feminine & Intimate Care",
};

const NEW_PARENTS = [
  ["Hair Care & Grooming", "hair-care-and-grooming"],
  ["Bath, Body & Hygiene", "bath-body-and-hygiene"],
  ["Feminine & Intimate Care", "feminine-and-intimate-care"],
] as const;

type Destination =
  | "Beauty / Face Bleach & De-Tan"
  | "Beauty / Hair Removal & Waxing"
  | "Beauty / Lip Care & Lipstick"
  | "Beauty / Eye Makeup"
  | "Beauty / Hair Styling"
  | "Beauty / Facial Skincare & Sun Protection"
  | "Beauty / Face Makeup, Nails & Beauty Tools"
  | "Hair Care & Grooming / Hair Care & Hair Colour"
  | "Hair Care & Grooming / Shaving & Grooming"
  | "Bath, Body & Hygiene / Bath & Body Care"
  | "Bath, Body & Hygiene / Fragrance & Deodorants"
  | "Bath, Body & Hygiene / Hand Hygiene"
  | "Bath, Body & Hygiene / Oral Care"
  | "Health & Wellness / Ayurvedic Remedies"
  | "Food & Beverages / Bakery, Biscuits & Cakes"
  | "Food & Beverages / Chocolates & Confectionery";

function destination(name: string): Destination {
  // Non-beauty products which were previously imported into a mixed skincare bucket.
  if (/kinder joy/i.test(name)) return "Food & Beverages / Chocolates & Confectionery";
  if (/bourbon|biscuits|treat creme wafers/i.test(name)) return "Food & Beverages / Bakery, Biscuits & Cakes";
  if (/(sand[u|o]|baidyanath|krishna ayurveda|kapiva).*(kadha|juice|arish|tablets|fizz|mix|oil)/i.test(name)) {
    return "Health & Wellness / Ayurvedic Remedies";
  }

  if (/bleach|blach|de-?tan/i.test(name)) return "Beauty / Face Bleach & De-Tan";
  if (/hair remov|\bveet\b|\bwax\b/i.test(name)) return "Beauty / Hair Removal & Waxing";
  if (/lip balm|lipstick|lip care|baba?ylips|lip & cheek|lip therapy/i.test(name)) return "Beauty / Lip Care & Lipstick";
  if (/kajal|kohl|liner|mascara/i.test(name)) return "Beauty / Eye Makeup";
  if (/compact|founda|\bcc\b|\bbb\b|pan-cake|makeup kit|nail|makeup tool|facial massager|facial razer|black head remover/i.test(name)) {
    return "Beauty / Face Makeup, Nails & Beauty Tools";
  }
  if (/(gatsby|set\s*wet|setwet|styling|hair wax|hair powder|pomade|hair gel|\bgel\b|clay)/i.test(name)) {
    return "Beauty / Hair Styling";
  }
  if (/shav|razor|blade|after shave/i.test(name)) return "Hair Care & Grooming / Shaving & Grooming";
  if (/(shamp|condition|hair colou?r|\bshade\b|\bcol\.|\bcn\d|henna|mehandi|\bdye\b|anti dandruff|scalp|hair serum|hair mask|hair spa|fructis|tresemme|livon|bhringraj|hair fall)/i.test(name)) {
    return "Hair Care & Grooming / Hair Care & Hair Colour";
  }
  if (/deodor|perfume|fragrance|deo\b|cologne|roll on/i.test(name)) return "Bath, Body & Hygiene / Fragrance & Deodorants";
  if (/hand wash|handwash|saniti[sz]er/i.test(name)) return "Bath, Body & Hygiene / Hand Hygiene";
  if (/tooth|toothpaste|mouthwash|oral|brush/i.test(name)) return "Bath, Body & Hygiene / Oral Care";
  if (/body wash|body lotion|body cream|body butter|body scrub|shower|\bsoap\b|body lot|b\.lot/i.test(name)) {
    return "Bath, Body & Hygiene / Bath & Body Care";
  }

  // The remaining products are facial skincare: face washes, moisturisers,
  // serums, masks, sunscreen, creams and facial kits with abbreviated names.
  return "Beauty / Facial Skincare & Sun Protection";
}

async function findChild(parentName: string, childName: string) {
  const parent = await prisma.category.findFirst({
    where: { name: parentName, parentId: null },
    include: { children: { where: { name: childName } } },
  });
  const child = parent?.children[0];
  if (!child) throw new Error(`Missing destination: ${parentName} → ${childName}`);
  return child;
}

async function main() {
  const personal = await prisma.category.findFirst({
    where: { name: "Personal Care", parentId: null },
    include: { children: { include: { products: true } } },
  });
  if (!personal) throw new Error("Personal Care category is missing");

  const mixed = personal.children.filter((category) => MIXED_SOURCES.includes(category.name as (typeof MIXED_SOURCES)[number]));
  if (mixed.length !== MIXED_SOURCES.length) throw new Error("A mixed Personal Care category is missing");
  const products = mixed.flatMap((category) => category.products);

  const groups = new Map<Destination, string[]>();
  for (const product of products) {
    const target = destination(product.name);
    if (!groups.has(target)) groups.set(target, []);
    groups.get(target)!.push(product.id);
  }

  console.log(`Mixed Personal Care products to classify: ${products.length}`);
  for (const [name, ids] of groups) console.log(`- ${name}: ${ids.length}`);
  for (const [name] of NEW_PARENTS) {
    const children = Object.entries(REPARENTED_SOURCES).filter(([, parent]) => parent === name).map(([child]) => child);
    console.log(`- ${name}: receives ${children.join(", ")}`);
  }
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to make these changes.");
    return;
  }

  const [beautyBleach, beautyRemoval, beautyLip, beautyEye, beautyStyling, beautyFacial, beautyMakeup, ayurvedic, bakery, chocolates] = await Promise.all([
    findChild("Beauty", "Face Bleach & De-Tan"),
    findChild("Beauty", "Hair Removal & Waxing"),
    findChild("Beauty", "Lip Care & Lipstick"),
    findChild("Beauty", "Eye Makeup"),
    findChild("Beauty", "Hair Styling"),
    findChild("Beauty", "Facial Skincare & Sun Protection"),
    findChild("Beauty", "Face Makeup, Nails & Beauty Tools"),
    findChild("Health & Wellness", "Ayurvedic Remedies"),
    findChild("Food & Beverages", "Bakery, Biscuits & Cakes"),
    findChild("Food & Beverages", "Chocolates & Confectionery"),
  ]);

  const targets = new Map<Destination, string>([
    ["Beauty / Face Bleach & De-Tan", beautyBleach.id],
    ["Beauty / Hair Removal & Waxing", beautyRemoval.id],
    ["Beauty / Lip Care & Lipstick", beautyLip.id],
    ["Beauty / Eye Makeup", beautyEye.id],
    ["Beauty / Hair Styling", beautyStyling.id],
    ["Beauty / Facial Skincare & Sun Protection", beautyFacial.id],
    ["Beauty / Face Makeup, Nails & Beauty Tools", beautyMakeup.id],
    ["Hair Care & Grooming / Hair Care & Hair Colour", personal.children.find((category) => category.name === "Hair Care & Hair Colour")!.id],
    ["Hair Care & Grooming / Shaving & Grooming", personal.children.find((category) => category.name === "Shaving & Grooming")!.id],
    ["Bath, Body & Hygiene / Bath & Body Care", personal.children.find((category) => category.name === "Bath & Body Care")!.id],
    ["Bath, Body & Hygiene / Fragrance & Deodorants", personal.children.find((category) => category.name === "Fragrance & Deodorants")!.id],
    ["Bath, Body & Hygiene / Hand Hygiene", personal.children.find((category) => category.name === "Hand Hygiene")!.id],
    ["Bath, Body & Hygiene / Oral Care", personal.children.find((category) => category.name === "Oral Care")!.id],
    ["Health & Wellness / Ayurvedic Remedies", ayurvedic.id],
    ["Food & Beverages / Bakery, Biscuits & Cakes", bakery.id],
    ["Food & Beverages / Chocolates & Confectionery", chocolates.id],
  ]);

  await prisma.$transaction(async (tx) => {
    const parentIds = new Map<string, string>();
    for (const [index, [name, slug]] of NEW_PARENTS.entries()) {
      const existing = await tx.category.findFirst({ where: { name, parentId: null } });
      const parent = existing ?? await tx.category.create({ data: { name, slug, sortOrder: 20 + index } });
      parentIds.set(name, parent.id);
    }

    for (const [childName, parentName] of Object.entries(REPARENTED_SOURCES)) {
      const child = personal.children.find((category) => category.name === childName);
      if (!child) throw new Error(`Missing Personal Care child: ${childName}`);
      await tx.category.update({ where: { id: child.id }, data: { parentId: parentIds.get(parentName)! } });
    }

    for (const [name, ids] of groups) {
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: targets.get(name)! } });
    }
    await tx.category.deleteMany({ where: { id: { in: mixed.map((category) => category.id) } } });
    await tx.category.delete({ where: { id: personal.id } });
  }, { timeout: 60000 });

  console.log("Personal Care has been replaced by the three new main categories.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
