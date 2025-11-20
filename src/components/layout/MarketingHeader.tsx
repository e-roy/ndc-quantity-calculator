"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

export function MarketingHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-md transition-all duration-300 supports-backdrop-filter:bg-black/20">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-white transition-opacity hover:opacity-90"
        >
          <Calculator className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight">
            NDC Calculator
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="#features"
            className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
          >
            Features
          </Link>

          <Button asChild className="font-semibold">
            <Link href="/login">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
