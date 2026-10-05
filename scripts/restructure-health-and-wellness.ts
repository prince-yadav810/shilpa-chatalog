import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

const PARENTS = [
  ["Medicines & First Aid", "medicines-and-first-aid"],
  ["Medical Support & Home Care", "medical-support-and-home-care"],
  ["Ayurveda & Nutrition", "ayurveda-and-nutrition"],
] as const;

const REPARENT: Record<string, string> = {
  "Medicines": "Medicines & First Aid",
  "First Aid & Wound Care": "Medicines & First Aid",
  "Pain Relief & Medical Supplies": "Medicines & First Aid",
  "Adult Incontinence Care": "Medical Support & Home Care",
  "Diagnostic Devices & Supplies": "Medical Support & Home Care",
  "Hot & Cold Therapy": "Medical Support & Home Care",
  "Medical Supports & Orthopaedic Aids": "Medical Support & Home Care",
  "Surgical & Medical Supplies": "Medical Support & Home Care",
  "Ayurvedic Remedies": "Ayurveda & Nutrition",
  "Nutrition & Supplements": "Ayurveda & Nutrition",
};

async function main() {
  const health = await prisma.category.findFirst({
    where: { name: "Health & Wellness", parentId: null },
    include: { children: true },
  });
  if (!health) throw new Error("Health & Wellness category is missing");

  const children = new Map(health.children.map((category) => [category.name, category]));
  for (const name of Object.keys(REPARENT)) if (!children.has(name)) throw new Error(`Missing Health & Wellness subcategory: ${name}`);

  for (const [child, parent] of Object.entries(REPARENT)) console.log(`- ${child} → ${parent}`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to make these changes.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const parentIds = new Map<string, string>();
    for (const [index, [name, slug]] of PARENTS.entries()) {
      const existing = await tx.category.findFirst({ where: { name, parentId: null } });
      const parent = existing ?? await tx.category.create({ data: { name, slug, sortOrder: 40 + index } });
      parentIds.set(name, parent.id);
    }
    for (const [childName, parentName] of Object.entries(REPARENT)) {
      await tx.category.update({ where: { id: children.get(childName)!.id }, data: { parentId: parentIds.get(parentName)! } });
    }
    await tx.category.delete({ where: { id: health.id } });
  });

  console.log("Health & Wellness has been replaced by the three new main categories.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
