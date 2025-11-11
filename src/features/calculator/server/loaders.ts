/**
 * Server-side data loaders for calculator feature.
 * These functions fetch and process calculation data.
 */

import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { calculations } from "@/server/db/calculator/schema";
import { CalculatorInputSchema } from "./schema";
import { parseSig, getPartialParseWarning } from "../utils/sigParser";
import { resolveToRxcui } from "./services/rxnorm";
import { computeQuantityWithWarnings } from "../utils/quantityMath";
import { rankNdcCandidates } from "./services/aiAssist";
import { auth } from "@/server/auth";
import type {
  Calculation,
  Warning,
  NdcCandidate,
  NormalizedSig,
} from "../types";

/**
 * Fetches a calculation by ID.
 * If normalizedJson is empty, computes it from inputJson and persists to DB.
 */
export async function getCalculationById(
  id: string,
): Promise<Calculation | null> {
  // Fetch calculation from database
  const [calculation] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, id))
    .limit(1);

  if (!calculation) {
    return null;
  }

  // If normalizedJson is empty/null, compute it from inputJson
  if (!calculation.normalizedJson && calculation.inputJson) {
    // Parse inputJson to get SIG
    const input = CalculatorInputSchema.safeParse(calculation.inputJson);
    if (input.success && input.data.sig) {
      // Parse the SIG
      const normalized = parseSig(input.data.sig);

      // Get existing warnings or initialize empty array
      const existingWarnings: Warning[] = calculation.warningsJson
        ? (calculation.warningsJson as Warning[])
        : [];

      // Add warning if parse is partial
      const partialWarning = getPartialParseWarning(normalized);
      const newWarnings: Warning[] = [...existingWarnings];

      if (partialWarning) {
        newWarnings.push({
          type: "invalid_sig",
          severity: "warning",
          message: partialWarning,
          field: "sig",
        });
      }

      // Resolve RxCUI if not already present and drugOrNdc is available
      if (!normalized.rxcui && input.data.drugOrNdc) {
        console.log(`[Loader] Resolving RxCUI for: "${input.data.drugOrNdc}"`);
        const rxnormResult = await resolveToRxcui(input.data.drugOrNdc);
        console.log(
          `[Loader] RxNorm result:`,
          rxnormResult.rxcui
            ? `RxCUI ${rxnormResult.rxcui}, Name: ${rxnormResult.name}`
            : "No match found",
        );

        // Update normalized with RxNorm data
        if (rxnormResult.rxcui) {
          normalized.rxcui = rxnormResult.rxcui;
          if (rxnormResult.name) {
            normalized.name = rxnormResult.name;
          }
          if (rxnormResult.strength) {
            normalized.strength = rxnormResult.strength;
          }
          if (rxnormResult.form) {
            normalized.form = rxnormResult.form;
          }

          // Add info warning if multiple candidates were found
          if (rxnormResult.candidates && rxnormResult.candidates > 1) {
            newWarnings.push({
              type: "other",
              severity: "info",
              message: `Multiple RxNorm candidates found (${rxnormResult.candidates}). Selected best match.`,
              field: "drugOrNdc",
            });
          }
        } else {
          // No RxCUI found - add unresolved warning
          newWarnings.push({
            type: "unresolved_rxcui",
            severity: "warning",
            message: `Could not resolve medication "${input.data.drugOrNdc}" to an RxCUI. The calculation may be incomplete.`,
            field: "drugOrNdc",
          });
        }
      }

      // Compute quantity if not already calculated
      let quantityValue: string | null = calculation.quantityValue;
      let quantityUnit: string | null = calculation.quantityUnit;
      const selectedNdc = calculation.selectedNdcJson
        ? (calculation.selectedNdcJson as NdcCandidate)
        : null;

      if (!quantityValue && input.data.daysSupply) {
        const quantityResult = computeQuantityWithWarnings(
          normalized,
          input.data.daysSupply,
          selectedNdc,
        );

        if (quantityResult.quantity) {
          quantityValue = quantityResult.quantity.quantityValue.toString();
          quantityUnit = quantityResult.quantity.quantityUnit;
          // Merge overfill/underfill warnings
          newWarnings.push(...quantityResult.warnings);
        }
      }

      // Update calculation in database
      await db
        .update(calculations)
        .set({
          normalizedJson: normalized,
          quantityValue,
          quantityUnit,
          warningsJson: newWarnings.length > 0 ? newWarnings : null,
        })
        .where(eq(calculations.id, id));

      // Return updated calculation
      return {
        ...calculation,
        normalizedJson: normalized,
        quantityValue,
        quantityUnit,
        warningsJson: newWarnings.length > 0 ? newWarnings : null,
      } as Calculation;
    }
  }

  // If normalizedJson exists but rxcui is missing, try to resolve it
  const existingNormalized = calculation.normalizedJson as {
    rxcui?: string;
    [key: string]: unknown;
  } | null;
  if (
    existingNormalized &&
    !existingNormalized.rxcui &&
    calculation.inputJson
  ) {
    const input = CalculatorInputSchema.safeParse(calculation.inputJson);
    if (input.success && input.data.drugOrNdc) {
      const rxnormResult = await resolveToRxcui(input.data.drugOrNdc);

      if (rxnormResult.rxcui) {
        // Update normalized with RxNorm data
        const updatedNormalized = {
          ...(existingNormalized as Record<string, unknown>),
          rxcui: rxnormResult.rxcui,
          ...(rxnormResult.name && { name: rxnormResult.name }),
          ...(rxnormResult.strength && { strength: rxnormResult.strength }),
          ...(rxnormResult.form && { form: rxnormResult.form }),
        };

        // Get existing warnings
        const existingWarnings: Warning[] = calculation.warningsJson
          ? (calculation.warningsJson as Warning[])
          : [];
        const newWarnings: Warning[] = [...existingWarnings];

        // Add info warning if multiple candidates
        if (rxnormResult.candidates && rxnormResult.candidates > 1) {
          newWarnings.push({
            type: "other",
            severity: "info",
            message: `Multiple RxNorm candidates found (${rxnormResult.candidates}). Selected best match.`,
            field: "drugOrNdc",
          });
        }

        // Compute quantity if not already calculated
        let quantityValue: string | null = calculation.quantityValue;
        let quantityUnit: string | null = calculation.quantityUnit;
        const selectedNdc = calculation.selectedNdcJson
          ? (calculation.selectedNdcJson as NdcCandidate)
          : null;

        if (!quantityValue && input.data.daysSupply) {
          const quantityResult = computeQuantityWithWarnings(
            updatedNormalized as NormalizedSig,
            input.data.daysSupply,
            selectedNdc,
          );

          if (quantityResult.quantity) {
            quantityValue = quantityResult.quantity.quantityValue.toString();
            quantityUnit = quantityResult.quantity.quantityUnit;
            // Merge overfill/underfill warnings
            newWarnings.push(...quantityResult.warnings);
          }
        }

        // Update calculation in database
        await db
          .update(calculations)
          .set({
            normalizedJson: updatedNormalized,
            quantityValue,
            quantityUnit,
            warningsJson: newWarnings.length > 0 ? newWarnings : null,
          })
          .where(eq(calculations.id, id));

        // Return updated calculation
        return {
          ...calculation,
          normalizedJson: updatedNormalized,
          quantityValue,
          quantityUnit,
          warningsJson: newWarnings.length > 0 ? newWarnings : null,
        } as Calculation;
      } else {
        // No RxCUI found - add unresolved warning if not already present
        const existingWarnings: Warning[] = calculation.warningsJson
          ? (calculation.warningsJson as Warning[])
          : [];
        const hasUnresolvedWarning = existingWarnings.some(
          (w) => w.type === "unresolved_rxcui",
        );

        if (!hasUnresolvedWarning) {
          const newWarnings: Warning[] = [
            ...existingWarnings,
            {
              type: "unresolved_rxcui",
              severity: "warning",
              message: `Could not resolve medication "${input.data.drugOrNdc}" to an RxCUI. The calculation may be incomplete.`,
              field: "drugOrNdc",
            },
          ];

          await db
            .update(calculations)
            .set({
              warningsJson: newWarnings.length > 0 ? newWarnings : null,
            })
            .where(eq(calculations.id, id));

          return {
            ...calculation,
            warningsJson: newWarnings.length > 0 ? newWarnings : null,
          } as Calculation;
        }
      }
    }
  }

  // Check if quantity needs to be computed (normalizedJson exists but quantityValue is null)
  if (
    calculation.normalizedJson &&
    !calculation.quantityValue &&
    calculation.inputJson
  ) {
    const input = CalculatorInputSchema.safeParse(calculation.inputJson);
    if (input.success && input.data.daysSupply) {
      const normalized = calculation.normalizedJson as NormalizedSig;
      const selectedNdc = calculation.selectedNdcJson
        ? (calculation.selectedNdcJson as NdcCandidate)
        : null;

      const quantityResult = computeQuantityWithWarnings(
        normalized,
        input.data.daysSupply,
        selectedNdc,
      );

      if (quantityResult.quantity) {
        const quantityValue = quantityResult.quantity.quantityValue.toString();
        const quantityUnit = quantityResult.quantity.quantityUnit;

        // Get existing warnings
        const existingWarnings: Warning[] = calculation.warningsJson
          ? (calculation.warningsJson as Warning[])
          : [];
        const newWarnings: Warning[] = [
          ...existingWarnings,
          ...quantityResult.warnings,
        ];

        // Update calculation in database
        await db
          .update(calculations)
          .set({
            quantityValue,
            quantityUnit,
            warningsJson: newWarnings.length > 0 ? newWarnings : null,
          })
          .where(eq(calculations.id, id));

        // Return updated calculation
        return {
          ...calculation,
          quantityValue,
          quantityUnit,
          warningsJson: newWarnings.length > 0 ? newWarnings : null,
        } as Calculation;
      }
    }
  }

  // Apply AI ranking if candidates exist and AI notes are not already set
  const candidatesArray = Array.isArray(calculation.ndcCandidatesJson)
    ? (calculation.ndcCandidatesJson as NdcCandidate[])
    : null;

  if (
    candidatesArray &&
    candidatesArray.length > 0 &&
    !calculation.aiNotes &&
    calculation.inputJson
  ) {
    try {
      const input = CalculatorInputSchema.safeParse(calculation.inputJson);
      if (input.success) {
        const normalized = calculation.normalizedJson as NormalizedSig | null;
        const candidates = candidatesArray;

        // Call AI ranking (non-blocking, wrapped in try-catch)
        const aiResult = await rankNdcCandidates(
          candidates,
          normalized,
          input.data,
        );

        if (aiResult) {
          // Update candidates with ranked scores
          const updatedCandidates = aiResult.rankedCandidates;
          let updatedSelectedNdc = calculation.selectedNdcJson as
            | NdcCandidate
            | null;

          // Set selectedNdcJson to top-ranked candidate if not already set
          if (!updatedSelectedNdc && aiResult.topCandidate) {
            updatedSelectedNdc = aiResult.topCandidate;
          }

          // Update calculation in database
          await db
            .update(calculations)
            .set({
              ndcCandidatesJson: updatedCandidates,
              aiNotes: aiResult.rationale,
              ...(updatedSelectedNdc && {
                selectedNdcJson: updatedSelectedNdc,
              }),
            })
            .where(eq(calculations.id, id));

          // Return updated calculation
          return {
            ...calculation,
            ndcCandidatesJson: updatedCandidates,
            aiNotes: aiResult.rationale,
            selectedNdcJson: updatedSelectedNdc ?? calculation.selectedNdcJson,
          } as Calculation;
        }
      }
    } catch (error) {
      // Silently fallback - log but don't throw
      console.log("[Loader] AI ranking failed:", error);
    }
  }

  // Return calculation as-is (with proper type casting)
  return calculation as Calculation;
}

/**
 * History query parameters for filtering and pagination.
 */
export type HistoryQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string; // Search in drugOrNdc field
  fromDate?: Date; // Start date filter
  toDate?: Date; // End date filter
};

/**
 * Result type for history queries.
 */
export type HistoryResult = {
  calculations: Calculation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Fetches calculation history with pagination, search, and date filtering.
 * If auth is enabled, filters by userId from session.
 */
export async function getHistory(
  params: HistoryQueryParams = {},
): Promise<HistoryResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    fromDate,
    toDate,
  } = params;

  // Get session if auth is enabled
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Build where conditions
  const conditions = [];

  // Filter by userId if auth is enabled and user is logged in
  if (userId) {
    conditions.push(eq(calculations.userId, userId));
  }

  // Date range filter
  if (fromDate) {
    conditions.push(gte(calculations.createdAt, fromDate));
  }
  if (toDate) {
    // Add one day to make it inclusive of the entire day
    const toDateEnd = new Date(toDate);
    toDateEnd.setHours(23, 59, 59, 999);
    conditions.push(lte(calculations.createdAt, toDateEnd));
  }

  // Search filter (case-insensitive search in JSONB field)
  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;
    conditions.push(
      sql`LOWER(${calculations.inputJson}->>'drugOrNdc') LIKE ${searchTerm}`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(calculations)
    .where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  // Calculate pagination
  const offset = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // Fetch calculations with pagination
  const results = await db
    .select()
    .from(calculations)
    .where(whereClause)
    .orderBy(desc(calculations.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    calculations: results as Calculation[],
    total,
    page,
    pageSize,
    totalPages,
  };
}
