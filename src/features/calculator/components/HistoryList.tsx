"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import type { HistoryResult } from "../server/loaders";
import type { Calculation } from "../types";

type HistoryListProps = {
  result: HistoryResult;
};

/**
 * Client component for displaying calculation history with search, filters, and pagination.
 * Uses URL searchParams for state management (Next.js 15 pattern).
 */
export function HistoryList({ result }: HistoryListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? "",
  );
  const [fromDate, setFromDate] = useState<Date | undefined>(
    searchParams.get("fromDate")
      ? new Date(searchParams.get("fromDate")!)
      : undefined,
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    searchParams.get("toDate")
      ? new Date(searchParams.get("toDate")!)
      : undefined,
  );

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      } else {
        params.delete("search");
      }
      // Reset to page 1 when search changes
      params.set("page", "1");
      router.push(`/calculator/history?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, router, searchParams]);

  const updateDateFilter = useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (from) {
        params.set("fromDate", from.toISOString().split("T")[0]!);
      } else {
        params.delete("fromDate");
      }
      if (to) {
        params.set("toDate", to.toISOString().split("T")[0]!);
      } else {
        params.delete("toDate");
      }
      // Reset to page 1 when date filter changes
      params.set("page", "1");
      router.push(`/calculator/history?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchValue("");
    setFromDate(undefined);
    setToDate(undefined);
    router.push("/calculator/history");
  }, [router]);

  const getStatusBadge = (status: Calculation["status"]) => {
    switch (status) {
      case "ready":
        return <Badge variant="default">Ready</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDrugOrNdc = (calc: Calculation): string => {
    if (calc.inputJson && typeof calc.inputJson === "object") {
      const input = calc.inputJson as { drugOrNdc?: string };
      return input.drugOrNdc ?? "N/A";
    }
    return "N/A";
  };

  const getSig = (calc: Calculation): string => {
    if (calc.inputJson && typeof calc.inputJson === "object") {
      const input = calc.inputJson as { sig?: string };
      const sig = input.sig ?? "";
      return sig.length > 50 ? `${sig.slice(0, 50)}...` : sig;
    }
    return "N/A";
  };

  const getQuantityDisplay = (calc: Calculation): string => {
    if (calc.quantityValue && calc.quantityUnit) {
      return `${calc.quantityValue} ${calc.quantityUnit}`;
    }
    return "—";
  };

  // Build pagination links
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `/calculator/history?${params.toString()}`;
  };

  const renderPagination = () => {
    if (result.totalPages <= 1) return null;

    const pages: (number | "ellipsis")[] = [];
    const currentPage = result.page;
    const totalPages = result.totalPages;

    // Always show first page
    if (currentPage > 3) {
      pages.push(1);
      if (currentPage > 4) pages.push("ellipsis");
    }

    // Show pages around current
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Always show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return (
      <Pagination>
        <PaginationContent>
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationPrevious href={buildPageUrl(currentPage - 1)} />
            </PaginationItem>
          )}
          {pages.map((page, idx) => {
            if (page === "ellipsis") {
              return (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href={buildPageUrl(page)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationNext href={buildPageUrl(currentPage + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by drug name or NDC..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 size-4" />
              {fromDate || toDate
                ? `${fromDate ? format(fromDate, "MMM d") : "Start"} - ${
                    toDate ? format(toDate, "MMM d") : "End"
                  }`
                : "Date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{
                from: fromDate,
                to: toDate,
              }}
              onSelect={(range) => {
                setFromDate(range?.from);
                setToDate(range?.to);
                updateDateFilter(range?.from, range?.to);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {(searchValue !== "" || fromDate !== undefined || toDate !== undefined) && (
          <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
            <XIcon className="mr-2 size-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      {result.total > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {result.calculations.length} of {result.total} calculation
          {result.total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Table */}
      {result.calculations.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Drug/NDC</TableHead>
                  <TableHead>SIG</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.calculations.map((calc) => (
                  <TableRow
                    key={calc.id}
                    className="cursor-pointer"
                    onClick={() => {
                      router.push(`/calculator/history/${calc.id}`);
                    }}
                  >
                    <TableCell>
                      {format(new Date(calc.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getDrugOrNdc(calc)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {getSig(calc)}
                    </TableCell>
                    <TableCell>{getQuantityDisplay(calc)}</TableCell>
                    <TableCell>{getStatusBadge(calc.status)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/calculator/history/${calc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {renderPagination()}
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No calculations found</EmptyTitle>
            <EmptyDescription>
              {searchValue || fromDate || toDate
                ? "Try adjusting your search or date filters."
                : "Start by creating a new calculation."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

