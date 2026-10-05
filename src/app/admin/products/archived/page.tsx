import { prisma } from "@/lib/prisma";
import { loadProductFormOptions } from "@/lib/admin-options";
import { AdminCatalogBrowser } from "@/components/admin/AdminCatalogBrowser";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ category?: string }> };

export default async function AdminArchivedProductsPage({ searchParams }: Props) {
  const [{ category: initialCategorySlug }, catalogCategories, options, activeCount, archivedCount] =
    await Promise.all([
      searchParams,
      prisma.category.findMany({
        where: { parentId: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          children: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, slug: true, imageUrl: true },
          },
        },
      }),
      loadProductFormOptions(),
      prisma.product.count({ where: { isArchived: false } }),
      prisma.product.count({ where: { isArchived: true } }),
    ]);

  return (
    <AdminCatalogBrowser
      categories={catalogCategories}
      leafCategories={options.categories}
      archived
      initialCategorySlug={initialCategorySlug}
      activeCount={activeCount}
      archivedCount={archivedCount}
    />
  );
}
