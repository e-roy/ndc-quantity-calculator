"use client";

import { usePathname } from "next/navigation";
import { MarketingHeader } from "./MarketingHeader";
import { AppHeader } from "./AppHeader";

export function HeaderSelector() {
  const pathname = usePathname();
  
  // No header on login page
  if (pathname === "/login") {
    return null;
  }
  
  // Use MarketingHeader for landing page, terms, and privacy pages
  const isMarketing =
    pathname === "/" ||
    pathname === "/terms" ||
    pathname === "/privacy";

  if (isMarketing) {
    return <MarketingHeader />;
  }

  // Use AppHeader for calculator routes
  if (pathname?.startsWith("/calculator")) {
    return <AppHeader />;
  }

  // Default to AppHeader for any other routes
  return <AppHeader />;
}

