"use client";

import { usePathname } from "next/navigation";
import { MarketingHeader } from "./MarketingHeader";
import dynamic from "next/dynamic";

// Dynamically import AppHeader to avoid pulling in server-only code during client bundling
// This ensures server-only imports (like database) aren't included in client bundle
const AppHeader = dynamic(
  () => import("./AppHeader").then((mod) => ({ default: mod.AppHeader })),
  {
    ssr: true,
  },
);

export function HeaderSelector() {
  const pathname = usePathname();

  // No header on login page
  if (pathname === "/login") {
    return null;
  }

  // Use MarketingHeader for landing page, terms, and privacy pages
  const isMarketing =
    pathname === "/" || pathname === "/terms" || pathname === "/privacy";

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
