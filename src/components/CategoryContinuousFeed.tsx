"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CategorySidebar, type SidebarCategoryItem } from "@/components/CategorySidebar";
import { ProductGrid } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandFilterPills } from "@/components/BrandFilterPills";
import type { ProductCardData } from "@/components/ProductCard";

export type SubcategoryFeedSection = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  products: ProductCardData[];
};

export function CategoryContinuousFeed({
  parentCategory,
  subcategories,
  brands,
  initialSubcategorySlug,
  whatsappNumber,
  storeName,
}: {
  parentCategory: {
    name: string;
    slug: string;
    imageUrl?: string | null;
    totalProducts: number;
  };
  subcategories: SubcategoryFeedSection[];
  brands: { name: string; slug: string; count: number }[];
  initialSubcategorySlug?: string;
  whatsappNumber: string;
  storeName: string;
}) {
  const [activeSlug, setActiveSlug] = useState<string>(
    initialSubcategorySlug ?? (subcategories[0]?.slug || "all")
  );
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to a specific subcategory section
  const scrollToSubcategory = useCallback((slug: string) => {
    isUserScrollingRef.current = true;
    setActiveSlug(slug);

    if (slug === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const targetElement = document.getElementById(slug);
      if (targetElement) {
        // Calculate offset to ensure sticky header does not cover section title
        const yOffset = -70;
        const y =
          targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }

    // Reset user scroll lock after smooth scrolling completes
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 800);
  }, []);

  // Handle deep-linking / initial subcategory scroll on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const targetSlug = hash || initialSubcategorySlug;

    if (targetSlug && targetSlug !== "all") {
      const timer = setTimeout(() => {
        scrollToSubcategory(targetSlug);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialSubcategorySlug, scrollToSubcategory]);

  // IntersectionObserver for continuous scroll spy
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-subcat-slug]");
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isUserScrollingRef.current) return;

        // Find the visible section that is closest to top/active
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by bounding client top to pick the one closest to top
          visibleEntries.sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
          );
          const topEntry = visibleEntries[0];
          const slug = topEntry.target.getAttribute("data-subcat-slug");
          if (slug) {
            setActiveSlug(slug);
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.2, 0.5],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [subcategories]);

  const sidebarItems: SidebarCategoryItem[] = subcategories.map((subcat) => ({
    id: subcat.id,
    name: subcat.name,
    slug: subcat.slug,
    imageUrl: subcat.imageUrl,
    productCount: subcat.products.length,
  }));

  const totalItemsCount = parentCategory.totalProducts;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] -mx-2 -mt-3 sm:-mx-4 sm:-mt-8">
      {/* Quick-Commerce Left Vertical Subcategory Sidebar */}
      {subcategories.length > 0 && (
        <CategorySidebar
          parentCategory={{
            name: parentCategory.name,
            slug: parentCategory.slug,
            imageUrl: parentCategory.imageUrl,
          }}
          subcategories={sidebarItems}
          activeSubcategorySlug={activeSlug}
          onSelectSubcategory={scrollToSubcategory}
        />
      )}

      {/* Main Right Scrollable Continuous Stream */}
      <div className="flex-1 min-w-0 px-2.5 py-3 sm:px-5 sm:py-5">
        {/* Category Header Area (Desktop only, mobile has top bar) */}
        <div className="hidden sm:block mb-4">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: parentCategory.name }]}
          />
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink">
            {parentCategory.name}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} in {parentCategory.name}
          </p>
        </div>

        {/* Brand Filter Pills */}
        <BrandFilterPills brands={brands} categorySlug={parentCategory.slug} />

        {/* Continuous Subcategory Stream Sections */}
        {subcategories.length === 0 || totalItemsCount === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
            <p className="font-heading text-base font-semibold text-ink">
              Nothing in {parentCategory.name} yet.
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              This section is being stocked. Try another category or message the shop.
            </p>
            <Link href="/" className="btn-secondary mt-4 inline-block text-xs">
              Back to all categories
            </Link>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {subcategories.map((subcat) => (
              <section
                key={subcat.id}
                id={subcat.slug}
                data-subcat-slug={subcat.slug}
                className="scroll-mt-14 sm:scroll-mt-16"
              >
                {/* Clean Subcategory Sticky Section Bar */}
                <div className="sticky top-[49px] sm:top-[57px] z-10 -mx-2.5 sm:-mx-5 mb-2.5 border-b border-border/70 bg-surface/95 px-2.5 sm:px-5 py-2 backdrop-blur shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-ink">
                      {subcat.name}
                    </h2>
                    <span className="text-[11px] font-medium text-ink-muted">
                      {subcat.products.length}{" "}
                      {subcat.products.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                {/* Subcategory Product Grid */}
                {subcat.products.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-5 text-center text-xs text-ink-muted">
                    No products currently in {subcat.name}
                  </div>
                ) : (
                  <ProductGrid
                    products={subcat.products}
                    whatsappNumber={whatsappNumber}
                    storeName={storeName}
                  />
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
