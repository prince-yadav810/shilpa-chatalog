import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export { slugify };

type SlugModel = "product" | "category" | "brand";

async function slugExists(model: SlugModel, slug: string, ignoreId?: string) {
  const where = { slug, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) };
  switch (model) {
    case "product":
      return (await prisma.product.count({ where })) > 0;
    case "category":
      return (await prisma.category.count({ where })) > 0;
    case "brand":
      return (await prisma.brand.count({ where })) > 0;
  }
}

/**
 * Slug that is unique within its table, suffixing -2, -3 … on collision.
 *
 * Call this exactly once, when the record is created. Updates must never
 * regenerate a slug: the product URL is what the shop pastes into WhatsApp
 * chats and status, and changing it on every price edit silently breaks every
 * link already out there. (The demo regenerated it on every save.)
 */
export async function uniqueSlug(
  model: SlugModel,
  name: string,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let n = 2;

  while (await slugExists(model, candidate, ignoreId)) {
    candidate = `${base}-${n}`;
    n += 1;
    // Pathological case: bail to something guaranteed free rather than loop.
    if (n > 200) return `${base}-${Date.now().toString(36)}`;
  }

  return candidate;
}
