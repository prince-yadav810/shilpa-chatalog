import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClientProductSection } from "@/components/ClientProductSection";

export const revalidate = 300;

type Props = {
  params: Promise<{ category: string; subcategory: string }>;
};

async function loadCategory(parentSlug: string, subSlug: string) {
  return prisma.category.findFirst({
    where: { slug: subSlug, isActive: true, parent: { slug: parentSlug, isActive: true } },
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true } }
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const found = await loadCategory(category, subcategory);
  if (!found || !found.parent) return {};

  return {
    title: `${found.name} — ${found.parent.name}`,
    description: `Browse ${found.name} at Shilpa and order on WhatsApp.`,
    alternates: { canonical: `/c/${category}/${subcategory}` },
  };
}

export default async function SubcategoryPage({ params }: Props) {
  const { category: parentSlug, subcategory: slug } = await params;

  const category = await loadCategory(parentSlug, slug);
  if (!category || !category.parent) notFound();

  const settings = await getSettings();

  return (
    <div className="py-2">
      <Breadcrumbs 
        items={[
          { label: "Home", href: "/" },
          { label: category.parent.name, href: `/c/${category.parent.slug}` },
          { label: category.name }
        ]} 
      />

      <header className="mb-4">
        <h1 className="font-heading text-lg font-bold text-ink sm:text-2xl">{category.name}</h1>
      </header>

      <ClientProductSection
        categoryId={category.id}
        whatsappNumber={settings.whatsappNumber}
        storeName={settings.storeName}
      />
    </div>
  );
}
