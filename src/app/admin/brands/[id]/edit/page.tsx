import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BrandEditForm } from "@/components/admin/BrandEditForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditBrandPage({ params }: Props) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <>
      <nav className="mb-4 text-caption text-ink-muted">
        <Link href="/admin/brands" className="hover:text-brand">
          Brands
        </Link>{" "}
        › Edit
      </nav>

      <h1 className="mb-6 font-heading text-section text-ink">{brand.name}</h1>

      <BrandEditForm
        brand={{
          id: brand.id,
          name: brand.name,
          logoUrl: brand.logoUrl,
          isActive: brand.isActive,
        }}
      />
    </>
  );
}
