"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppHeaderNav() {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/calculator"
        className={cn(
          "hover:text-foreground text-sm font-medium transition-colors",
          pathname === "/calculator"
            ? "text-foreground"
            : "text-muted-foreground",
        )}
      >
        Calculator
      </Link>
      <Link
        href="/calculator/history"
        className={cn(
          "hover:text-foreground text-sm font-medium transition-colors",
          pathname?.startsWith("/calculator/history")
            ? "text-foreground"
            : "text-muted-foreground",
        )}
      >
        History
      </Link>
    </>
  );
}
