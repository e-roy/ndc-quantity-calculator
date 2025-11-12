/**
 * FDA NDC Directory API service for retrieving NDC candidates.
 * Uses the FDA Open Data API to search for NDC codes by product name or NDC.
 */

import { withPerformanceLogging } from "@/lib/telemetry";
import type { NdcCandidate } from "../../types";

const FDA_BASE_URL = "https://api.fda.gov/drug/ndc.json";

export type FdaNdcSearchParams = {
  rxcui?: string; // RxNorm concept ID (may need to search by product name instead)
  productName?: string; // Product name to search
  ndc?: string; // Direct NDC code search
  limit?: number; // Max results (default 100)
};

/**
 * FDA API response structure for NDC data.
 */
type FdaNdcResponse = {
  results?: Array<{
    product_ndc?: string;
    product_type?: string;
    proprietary_name?: string;
    proprietary_name_suffix?: string;
    non_proprietary_name?: string;
    dosage_form?: string;
    route?: string[];
    active_ingredients?: Array<{
      name?: string;
      strength?: string;
    }>;
    marketing_category?: string;
    listing_expiration_date?: string;
    marketing_start_date?: string;
    package_ndc?: string;
    package_description?: string;
    labeler_name?: string;
    ndc_exclude_flag?: string;
    product_id?: string;
  }>;
  meta?: {
    results?: {
      total?: number;
      limit?: number;
      skip?: number;
    };
  };
};

/**
 * Normalizes an NDC code to 11-digit format.
 * FDA API returns NDCs in various formats (with/without dashes, 10/11 digits).
 * Converts to 11-digit format: XXXXX-XXXX-XX
 */
function normalizeNdc(ndc: string | undefined): string | null {
  if (!ndc) {
    return null;
  }

  // Remove dashes and spaces
  const cleaned = ndc.replace(/[-\s]/g, "");

  // Handle 10-digit NDCs (pad with leading zero)
  if (cleaned.length === 10) {
    const normalized = `0${cleaned}`;
    return `${normalized.slice(0, 5)}-${normalized.slice(5, 9)}-${normalized.slice(9)}`;
  }

  // Handle 11-digit NDCs
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
  }

  // Return as-is if format is unexpected (let validation handle it)
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Determines if an NDC is active based on expiration date.
 */
function isActiveNdc(expirationDate: string | undefined): boolean {
  if (!expirationDate) {
    return true; // Assume active if no expiration date
  }

  try {
    const expiration = new Date(expirationDate);
    const now = new Date();
    return expiration > now;
  } catch {
    return true; // Assume active if date parsing fails
  }
}

/**
 * Extracts strength from active ingredients.
 */
function extractStrength(
  activeIngredients: Array<{ name?: string; strength?: string }> | undefined,
): string | undefined {
  if (!activeIngredients || activeIngredients.length === 0) {
    return undefined;
  }

  // Combine all ingredient strengths
  const strengths = activeIngredients
    .map((ing) => ing.strength)
    .filter((s): s is string => !!s);

  return strengths.length > 0 ? strengths.join(", ") : undefined;
}

/**
 * Extracts unit from dosage form or package description.
 */
function extractUnit(
  dosageForm: string | undefined,
  packageDescription: string | undefined,
): string | undefined {
  // Try to extract unit from package description first (more specific)
  if (packageDescription) {
    const unitRegex = /\b(TABLET|CAPSULE|ML|MG|G|UNIT|PUFF|SPRAY|DROP)\b/i;
    const unitMatch = unitRegex.exec(packageDescription);
    if (unitMatch) {
      return unitMatch[1]?.toUpperCase();
    }
  }

  // Fallback to dosage form
  if (dosageForm) {
    const formUpper = dosageForm.toUpperCase();
    if (formUpper.includes("TABLET")) return "TABLET";
    if (formUpper.includes("CAPSULE")) return "CAPSULE";
    if (formUpper.includes("SOLUTION") || formUpper.includes("SUSPENSION"))
      return "ML";
    if (formUpper.includes("INHALATION")) return "PUFF";
  }

  return undefined;
}

/**
 * Searches FDA NDC Directory by product name.
 * Note: FDA API doesn't directly support RxCUI, so we search by product name.
 *
 * @param productName - Product name to search for
 * @param limit - Maximum number of results (default 100)
 * @returns Array of NDC candidates or empty array if not found
 */
async function searchByProductName(
  productName: string,
  limit = 100,
): Promise<NdcCandidate[]> {
  if (!productName || productName.trim().length === 0) {
    return [];
  }

  try {
    // Search by proprietary name or non-proprietary name
    // FDA API uses search parameter format: search=field:value
    // Try proprietary name first, then non-proprietary name
    const encodedName = encodeURIComponent(productName);

    // First try proprietary name search
    let url = `${FDA_BASE_URL}?search=proprietary_name:${encodedName}&limit=${limit}`;
    let response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    // Check if first search was successful and has results
    if (response.ok) {
      const data = (await response.json()) as FdaNdcResponse;
      if (data.results && data.results.length > 0) {
        return parseFdaResponse(data);
      }
    }

    // If proprietary name search fails or returns no results, try non-proprietary name
    url = `${FDA_BASE_URL}?search=non_proprietary_name:${encodedName}&limit=${limit}`;
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as FdaNdcResponse;
      if (data.results && data.results.length > 0) {
        return parseFdaResponse(data);
      }
    }

    // If still no results, try a general text search
    url = `${FDA_BASE_URL}?search=${encodedName}&limit=${limit}`;
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.log(
        `[FDA NDC] Search failed for "${productName}": ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = (await response.json()) as FdaNdcResponse;
    return parseFdaResponse(data);
  } catch (error) {
    console.error("[FDA NDC] API error for product name:", productName, error);
    return [];
  }
}

/**
 * Searches FDA NDC Directory by NDC code.
 *
 * @param ndc - NDC code to search for
 * @returns Array of NDC candidates (typically 0 or 1 result)
 */
async function searchByNdc(ndc: string): Promise<NdcCandidate[]> {
  if (!ndc || ndc.trim().length === 0) {
    return [];
  }

  try {
    // Normalize NDC for search (remove dashes)
    const cleanedNdc = ndc.replace(/[-\s]/g, "");
    const encodedNdc = encodeURIComponent(cleanedNdc);

    // Try product_ndc first
    let url = `${FDA_BASE_URL}?search=product_ndc:${encodedNdc}&limit=10`;
    let response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    // Check if first search was successful and has results
    if (response.ok) {
      const data = (await response.json()) as FdaNdcResponse;
      if (data.results && data.results.length > 0) {
        return parseFdaResponse(data);
      }
    }

    // If product_ndc search fails, try package_ndc
    url = `${FDA_BASE_URL}?search=package_ndc:${encodedNdc}&limit=10`;
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.log(
        `[FDA NDC] Search failed for NDC "${ndc}": ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = (await response.json()) as FdaNdcResponse;
    return parseFdaResponse(data);
  } catch (error) {
    console.error("[FDA NDC] API error for NDC:", ndc, error);
    return [];
  }
}

/**
 * Parses FDA API response into NdcCandidate array.
 */
function parseFdaResponse(data: FdaNdcResponse): NdcCandidate[] {
  if (!data.results || data.results.length === 0) {
    return [];
  }

  const candidates: NdcCandidate[] = [];

  for (const result of data.results) {
    // Prefer product_ndc, fallback to package_ndc
    const ndcCode = result.product_ndc ?? result.package_ndc;
    if (!ndcCode) {
      continue; // Skip if no NDC code
    }

    const normalizedNdc = normalizeNdc(ndcCode);
    if (!normalizedNdc) {
      continue; // Skip if normalization fails
    }

    // Build product name from proprietary name and suffix
    const productName =
      result.proprietary_name && result.proprietary_name_suffix
        ? `${result.proprietary_name} ${result.proprietary_name_suffix}`.trim()
        : (result.proprietary_name ??
          result.non_proprietary_name ??
          "Unknown Product");

    // Determine active status
    const expirationDate = result.listing_expiration_date;
    const active = isActiveNdc(expirationDate);

    // Extract strength
    const strength = extractStrength(result.active_ingredients);

    // Extract unit
    const unit = extractUnit(result.dosage_form, result.package_description);

    candidates.push({
      ndc: normalizedNdc,
      labelerName: result.labeler_name,
      productName,
      packageDescription: result.package_description,
      strength,
      unit,
      active,
      startDate: result.marketing_start_date,
      endDate: expirationDate,
      // Note: FDA API doesn't provide RxCUI directly, would need separate mapping
      rxCui: undefined,
    });
  }

  return candidates;
}

/**
 * Searches FDA NDC Directory for NDC candidates.
 * Can search by RxCUI (via product name lookup), product name, or NDC code.
 *
 * @param params - Search parameters
 * @returns Array of NDC candidates
 */
export async function searchFdaNdc(
  params: FdaNdcSearchParams,
): Promise<NdcCandidate[]> {
  const { ndc, productName, limit = 100 } = params;

  return withPerformanceLogging(
    "fda.search",
    async () => {
      // If NDC is provided, search by NDC
      if (ndc) {
        return searchByNdc(ndc);
      }

      // If product name is provided, search by product name
      if (productName) {
        return searchByProductName(productName, limit);
      }

      // If only RxCUI is provided, we can't directly search FDA by RxCUI
      // This would require a mapping service or searching by a name derived from RxCUI
      // For now, return empty array
      if (params.rxcui) {
        console.log(
          "[FDA NDC] Cannot search FDA API directly by RxCUI. Product name required.",
        );
        return [];
      }

      return [];
    },
    { hasNdc: !!ndc, hasProductName: !!productName, limit },
  );
}

/**
 * Searches FDA NDC Directory using RxNorm result.
 * Uses the resolved name from RxNorm to search FDA.
 *
 * @param rxnormResult - RxNorm resolution result with name
 * @param limit - Maximum number of results
 * @returns Array of NDC candidates
 */
export async function searchFdaNdcByRxNorm(
  rxnormResult: { name: string | null; rxcui: string | null },
  limit = 100,
): Promise<NdcCandidate[]> {
  if (!rxnormResult.name) {
    return [];
  }

  return withPerformanceLogging(
    "fda.searchByRxNorm",
    async () => {
      // Search FDA by the resolved product name from RxNorm
      const candidates = await searchByProductName(rxnormResult.name!, limit);

      // Add RxCUI to candidates if available
      if (rxnormResult.rxcui) {
        return candidates.map((candidate) => ({
          ...candidate,
          rxCui: rxnormResult.rxcui ?? undefined,
        }));
      }

      return candidates;
    },
    { rxcui: rxnormResult.rxcui, productName: rxnormResult.name, limit },
  );
}
