"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
  const pathname = usePathname();

  // Don't render breadcrumbs outside /calculator* routes
  if (!pathname?.startsWith("/calculator")) {
    return null;
  }

  // Determine breadcrumb segments based on pathname
  const getBreadcrumbs = () => {
    if (pathname === "/calculator") {
      return [{ label: "Calculator", href: null }];
    }

    if (pathname?.startsWith("/calculator/history/")) {
      return [
        { label: "Calculator", href: "/calculator" },
        { label: "History", href: "/calculator/history" },
        { label: "Entry", href: null },
      ];
    }

    if (pathname === "/calculator/history") {
      return [
        { label: "Calculator", href: "/calculator" },
        { label: "History", href: null },
      ];
    }

    // /calculator/[id]
    return [
      { label: "Calculator", href: "/calculator" },
      { label: "Result", href: null },
    ];
  };

  const segments = getBreadcrumbs();

  return (
    <div className="bg-muted/40 mx-auto max-w-7xl border-b px-4 py-2">
      <Breadcrumb>
        <BreadcrumbList className="justify-start">
          {segments.flatMap((segment, index) => [
            <BreadcrumbItem key={`item-${index}`}>
              {segment.href ? (
                <BreadcrumbLink asChild>
                  <Link href={segment.href}>{segment.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>,
            ...(index < segments.length - 1
              ? [<BreadcrumbSeparator key={`sep-${index}`} />]
              : []),
          ])}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
