import { StoreHeader } from "@/components/StoreHeader";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function Header() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, imageUrl: true },
    }),
  ]);

  return (
    <StoreHeader
      storeName={settings.storeName}
      categories={categories}
    />
  );
}
