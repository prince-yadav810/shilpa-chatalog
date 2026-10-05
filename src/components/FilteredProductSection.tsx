"use client";

import { useState } from "react";
import {
  CatalogFilters,
  defaultCatalogFilters,
  type CatalogBrandOption,
  type CatalogFilterValue,
} from "@/components/CatalogFilters";
import { ClientProductSection } from "@/components/ClientProductSection";

/** Filter-enabled product grid for a standalone leaf category. */
export function FilteredProductSection({
  categoryId,
  brands,
  whatsappNumber,
  storeName,
}: {
  categoryId: string;
  brands: CatalogBrandOption[];
  whatsappNumber: string;
  storeName: string;
}) {
  const [filters, setFilters] = useState<CatalogFilterValue>(defaultCatalogFilters);

  return (
    <>
      <CatalogFilters brands={brands} value={filters} onChange={setFilters} />
      <ClientProductSection
        categoryId={categoryId}
        brandId={filters.brandId ?? undefined}
        inStockOnly={filters.inStockOnly}
        sort={filters.sort}
        whatsappNumber={whatsappNumber}
        storeName={storeName}
      />
    </>
  );
}
