"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MarketingHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">NDC Calculator!!</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/login"
            className={`hover:text-foreground text-sm font-medium transition-colors ${
              pathname === "/login"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
