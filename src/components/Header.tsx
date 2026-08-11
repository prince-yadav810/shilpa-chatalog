import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CartButton } from "@/components/CartButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { CategoryBar } from "@/components/CategoryBar";
import { buildContactLink, formatDisplayNumber } from "@/lib/whatsapp";
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
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface shadow-xs">
      {/* Top Header Row with Logo, Desktop Search & Actions */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:gap-5 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt=""
            width={34}
            height={34}
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
            priority
          />
          <span className="font-heading text-base sm:text-lg text-brand font-bold">
            {settings.storeName}
          </span>
        </Link>

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="field h-[38px]" />}>
            <SearchBar />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <CartButton />
          {settings.whatsappNumber && (
            <a
              href={buildContactLink(settings.whatsappNumber, settings.storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-caption"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden lg:inline">
                {formatDisplayNumber(settings.whatsappNumber)}
              </span>
              <span className="lg:hidden">Chat</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile Search Bar Row (Directly below Header) */}
      <div className="border-t border-border/60 md:hidden">
        <div className="px-3 py-2">
          <Suspense fallback={<div className="field h-[36px]" />}>
            <SearchBar />
          </Suspense>
        </div>
      </div>

      {/* Always Visible Sticky 3D Category Logo Strip */}
      {categories.length > 0 && <CategoryBar categories={categories} />}
    </header>
  );
}
