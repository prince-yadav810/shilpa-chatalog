import { prisma } from "@/lib/prisma";
import type { BrandOption, CategoryOption } from "@/components/admin/ProductForm";

/**
 * Only leaf categories are selectable — a product on a parent that has
 * children would never appear on any listing page.
 */
export async function loadProductFormOptions(): Promise<{
  categories: CategoryOption[];
  brands: BrandOption[];
}> {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { children: { none: {} } },
      select: {
        id: true,
        name: true,
        parent: { select: { name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      parentName: c.parent?.name ?? "Top level",
    })),
    brands,
  };
}
