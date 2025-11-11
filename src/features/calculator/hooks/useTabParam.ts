"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

export type TabValue = "summary" | "ndc" | "quantity" | "warnings" | "json";

const VALID_TABS: TabValue[] = ["summary", "ndc", "quantity", "warnings", "json"];
const DEFAULT_TAB: TabValue = "summary";

/**
 * Hook to manage tab state synchronized with URL query parameter.
 * Updates URL without navigation using router.replace.
 */
export function useTabParam(): [TabValue, (tab: TabValue) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && VALID_TABS.includes(tabParam as TabValue)) {
      return tabParam as TabValue;
    }
    return DEFAULT_TAB;
  }, [searchParams]);

  const setTab = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return [activeTab, setTab];
}

