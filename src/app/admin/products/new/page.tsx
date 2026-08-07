import Link from "next/link";
import { ProductForm, EMPTY_PRODUCT } from "@/components/admin/ProductForm";
import { loadProductFormOptions } from "@/lib/admin-options";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { categories, brands } = await loadProductFormOptions();

  return (
    <>
      <nav className="mb-4 text-caption text-ink-muted">
        <Link href="/admin/products" className="hover:text-brand">
          Products
        </Link>{" "}
        › Add
      </nav>

      <h1 className="mb-6 font-heading text-section text-ink">Add a product</h1>

      <ProductForm initial={EMPTY_PRODUCT} categories={categories} brands={brands} />
    </>
  );
}
