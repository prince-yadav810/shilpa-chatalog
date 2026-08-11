"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.target &&
        anchor.pathname !== window.location.pathname
      ) {
        setIsNavigating(true);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-brand/20 overflow-hidden">
      <div className="h-full bg-brand animate-pulse w-full origin-left transition-all duration-300" />
    </div>
  );
}
