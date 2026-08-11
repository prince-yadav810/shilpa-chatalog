import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyMobileBar } from "@/components/StickyMobileBar";
import { NavigationProgress } from "@/components/NavigationProgress";
import { getSettings } from "@/lib/settings";
import { Suspense } from "react";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <CartProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <div className="flex min-h-screen flex-col pb-12 sm:pb-0">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-2 sm:px-4 py-3 sm:py-8">
          {children}
        </main>
        <Footer />
      </div>
      <StickyMobileBar />
      <CartDrawer
        whatsappNumber={settings.whatsappNumber}
        storeName={settings.storeName}
      />
    </CartProvider>
  );
}
