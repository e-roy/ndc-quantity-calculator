/**
 * RxNorm API service for resolving drug names/NDCs to RxCUI.
 * Uses the RxNorm REST API to normalize medication names.
 */

import { withPerformanceLogging } from "@/lib/telemetry";

const RXNORM_BASE_URL = "https://rxnav.nlm.nih.gov";

export type RxNormResult = {
  rxcui: string | null;
  name: string | null;
  strength?: string;
  form?: string;
  candidates?: number;
};

/**
 * Resolves a drug name or NDC to an RxCUI using RxNorm API.
 * Uses simple heuristics to select the best candidate when multiple matches exist.
 *
 * @param drugOrNdc - Drug name or NDC code to resolve
 * @returns Promise with resolved RxCUI data or null values if not found
 */
export async function resolveToRxcui(drugOrNdc: string): Promise<RxNormResult> {
  if (!drugOrNdc || drugOrNdc.trim().length === 0) {
    return { rxcui: null, name: null };
  }

  const term = drugOrNdc.trim();

  return withPerformanceLogging(
    "rxnorm.resolve",
    async () => {
      try {
        // First, try exact match via rxcui endpoint
        const exactMatch = await tryExactMatch(term);
        if (exactMatch) {
          return exactMatch;
        }

        // Fallback to approximate term matching
        const approximateMatch = await tryApproximateMatch(term);
        return approximateMatch;
      } catch (error) {
        // Log error but don't throw - return null values gracefully
        console.error("[RxNorm] API error for term:", term, error);
        return { rxcui: null, name: null };
      }
    },
    { term, drugOrNdc },
  );
}

/**
 * Attempts exact match lookup via RxNorm rxcui endpoint.
 */
async function tryExactMatch(term: string): Promise<RxNormResult | null> {
  try {
    const url = `${RXNORM_BASE_URL}/REST/rxcui.json?name=${encodeURIComponent(term)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.log(
        `[RxNorm] Exact match failed for "${term}": ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as {
      idGroup?: { rxnormId?: string[] };
    };

    if (data.idGroup?.rxnormId && data.idGroup.rxnormId.length > 0) {
      const rxcui = data.idGroup.rxnormId[0];
      if (!rxcui) {
        return null;
      }
      console.log(`[RxNorm] Exact match found for "${term}": RxCUI ${rxcui}`);
      // Get drug properties for name, strength, form
      const properties = await getDrugProperties(rxcui);
      return {
        rxcui,
        name: properties.name ?? term,
        strength: properties.strength,
        form: properties.form,
        candidates: 1,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Attempts approximate term matching via RxNorm approximateTerm endpoint.
 */
async function tryApproximateMatch(term: string): Promise<RxNormResult> {
  try {
    const url = `${RXNORM_BASE_URL}/REST/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=10`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.log(
        `[RxNorm] Approximate match failed for "${term}": ${response.status} ${response.statusText}`,
      );
      return { rxcui: null, name: null };
    }

    const data = (await response.json()) as {
      approximateGroup?: {
        candidate?: Array<{
          rxcui?: string;
          score?: string;
          rank?: string;
          name?: string;
        }>;
      };
    };

    const candidates = data.approximateGroup?.candidate ?? [];
    if (candidates.length === 0) {
      return { rxcui: null, name: null };
    }

    // Simple heuristic: prefer rank=1, then prefer SCD types, then first valid
    // Sort by rank (lower is better), then by score (higher is better)
    const sortedCandidates = candidates
      .filter((c) => c.rxcui)
      .sort((a, b) => {
        const rankA = parseInt(a.rank ?? "999", 10);
        const rankB = parseInt(b.rank ?? "999", 10);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        const scoreA = parseFloat(a.score ?? "0");
        const scoreB = parseFloat(b.score ?? "0");
        return scoreB - scoreA;
      });

    if (sortedCandidates.length === 0) {
      return { rxcui: null, name: null };
    }

    const bestCandidate = sortedCandidates[0];
    if (!bestCandidate?.rxcui) {
      return { rxcui: null, name: null };
    }

    const rxcui = bestCandidate.rxcui;

    console.log(
      `[RxNorm] Approximate match found for "${term}": RxCUI ${rxcui} (${sortedCandidates.length} candidates)`,
    );

    // Get drug properties for name, strength, form
    const properties = await getDrugProperties(rxcui);

    return {
      rxcui,
      name: properties.name ?? bestCandidate.name ?? term,
      strength: properties.strength,
      form: properties.form,
      candidates: sortedCandidates.length,
    };
  } catch {
    return { rxcui: null, name: null };
  }
}

/**
 * Gets drug properties (name, strength, form) for a given RxCUI.
 */
async function getDrugProperties(
  rxcui: string,
): Promise<{ name: string | null; strength?: string; form?: string }> {
  try {
    // Get drug properties via RxNorm property endpoint
    const url = `${RXNORM_BASE_URL}/REST/rxcui/${rxcui}/properties.json`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { name: null };
    }

    const data = (await response.json()) as {
      properties?: {
        name?: string;
        strength?: string;
        dosageForm?: string;
      };
    };

    const props = data.properties;
    if (!props) {
      return { name: null };
    }

    return {
      name: props.name ?? null,
      strength: props.strength,
      form: props.dosageForm,
    };
  } catch {
    return { name: null };
  }
}
