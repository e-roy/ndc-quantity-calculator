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
import { searchFdaNdcByRxNorm, searchFdaNdc } from "./services/fdaNdc";
import { selectOptimalNdc } from "./services/ndcSelection";
import { computeQuantityWithWarnings } from "../utils/quantityMath";
import { rankNdcCandidates } from "./services/aiAssist";
import { auth } from "@/server/auth";
import { withPerformanceLogging, logPerformance } from "@/lib/telemetry";
import { trackCalculation } from "@/lib/analytics";
import { logAccess } from "@/lib/audit";
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
  // Get user ID from session for audit logging
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Fetch calculation from database
  const [calculation] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, id))
    .limit(1);

  if (!calculation) {
    return null;
  }

  // Log access to calculation (non-blocking)
  void logAccess("calculation", id, userId, {
    calculationStatus: calculation.status,
  }).catch((error) => {
    console.error("[Loader] Failed to log access:", error);
  });

  // If normalizedJson is empty/null, compute it from inputJson
  if (!calculation.normalizedJson && calculation.inputJson) {
    const calculationStart = Date.now();
    let normalizationDuration = 0;
    let ndcLookupDuration = 0;
    let quantityCalculationDuration = 0;

    // Parse inputJson to get SIG
    const input = CalculatorInputSchema.safeParse(calculation.inputJson);
    if (input.success && input.data.sig) {
      // Parse the SIG
      const sigParseStart = Date.now();
      const normalized = parseSig(input.data.sig);
      normalizationDuration = Date.now() - sigParseStart;

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

      // Fetch NDC candidates from FDA if not already present
      let ndcCandidates: NdcCandidate[] | null = calculation.ndcCandidatesJson
        ? (calculation.ndcCandidatesJson as NdcCandidate[])
        : null;

      if (!ndcCandidates || ndcCandidates.length === 0) {
        const ndcLookupStart = Date.now();
        try {
          console.log(
            `[Loader] Fetching NDC candidates for: "${input.data.drugOrNdc}"`,
          );

          // Try to fetch by RxNorm result if available
          if (normalized.rxcui && normalized.name) {
            const candidates = await searchFdaNdcByRxNorm(
              { rxcui: normalized.rxcui, name: normalized.name },
              100,
            );
            if (candidates.length > 0) {
              ndcCandidates = candidates;
              console.log(
                `[Loader] Found ${candidates.length} NDC candidates from FDA`,
              );
            }
          }

          // If no candidates from RxNorm search, try direct NDC search if input is an NDC
          if (
            (!ndcCandidates || ndcCandidates.length === 0) &&
            input.data.drugOrNdc
          ) {
            // Check if input looks like an NDC (contains digits and possibly dashes)
            const ndcPattern = /^\d{4,5}-?\d{3,4}-?\d{1,2}$/;
            if (ndcPattern.test(input.data.drugOrNdc.replace(/\s/g, ""))) {
              const candidates = await searchFdaNdc({
                ndc: input.data.drugOrNdc,
              });
              if (candidates.length > 0) {
                ndcCandidates = candidates;
                console.log(
                  `[Loader] Found ${candidates.length} NDC candidates from direct NDC search`,
                );
              }
            }
          }

          // If still no candidates, try searching by product name
          if (
            (!ndcCandidates || ndcCandidates.length === 0) &&
            input.data.drugOrNdc
          ) {
            const candidates = await searchFdaNdc({
              productName: input.data.drugOrNdc,
            });
            if (candidates.length > 0) {
              ndcCandidates = candidates;
              console.log(
                `[Loader] Found ${candidates.length} NDC candidates from product name search`,
              );
            }
          }

          // Add warning if no NDCs found
          if (!ndcCandidates || ndcCandidates.length === 0) {
            newWarnings.push({
              type: "missing_ndc",
              severity: "warning",
              message: `No NDC candidates found for "${input.data.drugOrNdc}". The calculation may be incomplete.`,
              field: "drugOrNdc",
            });
          }
        } catch (error) {
          // Log but don't throw - graceful degradation
          console.error("[Loader] FDA NDC search failed:", error);
          newWarnings.push({
            type: "other",
            severity: "warning",
            message:
              "Failed to fetch NDC candidates from FDA. The calculation may be incomplete.",
            field: "drugOrNdc",
          });
        } finally {
          ndcLookupDuration = Date.now() - ndcLookupStart;
        }
      }

      // Select optimal NDC using deterministic logic if candidates exist and no selection yet
      let selectedNdc: NdcCandidate | null = calculation.selectedNdcJson
        ? (calculation.selectedNdcJson as NdcCandidate)
        : null;

      if (!selectedNdc && ndcCandidates && ndcCandidates.length > 0) {
        console.log(
          `[Loader] Selecting optimal NDC from ${ndcCandidates.length} candidates`,
        );
        selectedNdc = selectOptimalNdc(
          ndcCandidates,
          normalized,
          input.data.daysSupply,
        );
        if (selectedNdc) {
          console.log(
            `[Loader] Selected NDC: ${selectedNdc.ndc} (${selectedNdc.productName})`,
          );
        }
      }

      // Compute quantity if not already calculated
      let quantityValue: string | null = calculation.quantityValue;
      let quantityUnit: string | null = calculation.quantityUnit;

      if (!quantityValue && input.data.daysSupply) {
        const quantityCalcStart = Date.now();
        const quantityResult = computeQuantityWithWarnings(
          normalized,
          input.data.daysSupply,
          selectedNdc,
        );
        quantityCalculationDuration = Date.now() - quantityCalcStart;

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
          ndcCandidatesJson:
            ndcCandidates && ndcCandidates.length > 0 ? ndcCandidates : null,
          selectedNdcJson: selectedNdc,
          quantityValue,
          quantityUnit,
          warningsJson: newWarnings.length > 0 ? newWarnings : null,
        })
        .where(eq(calculations.id, id));

      // Log total calculation performance
      const totalDuration = Date.now() - calculationStart;
      logPerformance("calculation.complete", totalDuration, {
        calculationId: id,
        normalizationDuration,
        ndcLookupDuration,
        quantityCalculationDuration,
        hasRxCui: !!normalized.rxcui,
        ndcCandidateCount: ndcCandidates?.length ?? 0,
        warningCount: newWarnings.length,
      });

      // Build updated calculation object
      const updatedCalculation: Calculation = {
        ...calculation,
        normalizedJson: normalized,
        ndcCandidatesJson:
          ndcCandidates && ndcCandidates.length > 0 ? ndcCandidates : null,
        selectedNdcJson: selectedNdc,
        quantityValue,
        quantityUnit,
        warningsJson: newWarnings.length > 0 ? newWarnings : null,
        status: "ready",
      } as Calculation;

      // Track calculation metrics (non-blocking)
      void trackCalculation(updatedCalculation, normalized).catch((error) => {
        console.error("[Loader] Failed to track calculation metrics:", error);
      });

      // Return updated calculation
      return updatedCalculation;
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

        // Fetch NDC candidates from FDA if not already present
        let ndcCandidates: NdcCandidate[] | null = calculation.ndcCandidatesJson
          ? (calculation.ndcCandidatesJson as NdcCandidate[])
          : null;

        if (!ndcCandidates || ndcCandidates.length === 0) {
          try {
            console.log(
              `[Loader] Fetching NDC candidates for: "${input.data.drugOrNdc}"`,
            );

            // Try to fetch by RxNorm result
            if (rxnormResult.rxcui && rxnormResult.name) {
              const candidates = await searchFdaNdcByRxNorm(
                { rxcui: rxnormResult.rxcui, name: rxnormResult.name },
                100,
              );
              if (candidates.length > 0) {
                ndcCandidates = candidates;
                console.log(
                  `[Loader] Found ${candidates.length} NDC candidates from FDA`,
                );
              }
            }

            // If no candidates from RxNorm search, try direct NDC search if input is an NDC
            if (
              (!ndcCandidates || ndcCandidates.length === 0) &&
              input.data.drugOrNdc
            ) {
              const ndcPattern = /^\d{4,5}-?\d{3,4}-?\d{1,2}$/;
              if (ndcPattern.test(input.data.drugOrNdc.replace(/\s/g, ""))) {
                const candidates = await searchFdaNdc({
                  ndc: input.data.drugOrNdc,
                });
                if (candidates.length > 0) {
                  ndcCandidates = candidates;
                  console.log(
                    `[Loader] Found ${candidates.length} NDC candidates from direct NDC search`,
                  );
                }
              }
            }

            // If still no candidates, try searching by product name
            if (
              (!ndcCandidates || ndcCandidates.length === 0) &&
              input.data.drugOrNdc
            ) {
              const candidates = await searchFdaNdc({
                productName: input.data.drugOrNdc,
              });
              if (candidates.length > 0) {
                ndcCandidates = candidates;
                console.log(
                  `[Loader] Found ${candidates.length} NDC candidates from product name search`,
                );
              }
            }

            // Add warning if no NDCs found
            if (!ndcCandidates || ndcCandidates.length === 0) {
              newWarnings.push({
                type: "missing_ndc",
                severity: "warning",
                message: `No NDC candidates found for "${input.data.drugOrNdc}". The calculation may be incomplete.`,
                field: "drugOrNdc",
              });
            }
          } catch (error) {
            console.error("[Loader] FDA NDC search failed:", error);
            newWarnings.push({
              type: "other",
              severity: "warning",
              message:
                "Failed to fetch NDC candidates from FDA. The calculation may be incomplete.",
              field: "drugOrNdc",
            });
          }
        }

        // Select optimal NDC using deterministic logic if candidates exist and no selection yet
        let selectedNdc: NdcCandidate | null = calculation.selectedNdcJson
          ? (calculation.selectedNdcJson as NdcCandidate)
          : null;

        if (!selectedNdc && ndcCandidates && ndcCandidates.length > 0) {
          console.log(
            `[Loader] Selecting optimal NDC from ${ndcCandidates.length} candidates`,
          );
          selectedNdc = selectOptimalNdc(
            ndcCandidates,
            updatedNormalized as NormalizedSig,
            input.data.daysSupply,
          );
          if (selectedNdc) {
            console.log(
              `[Loader] Selected NDC: ${selectedNdc.ndc} (${selectedNdc.productName})`,
            );
          }
        }

        // Compute quantity if not already calculated
        let quantityValue: string | null = calculation.quantityValue;
        let quantityUnit: string | null = calculation.quantityUnit;

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
            ndcCandidatesJson:
              ndcCandidates && ndcCandidates.length > 0 ? ndcCandidates : null,
            selectedNdcJson: selectedNdc,
            quantityValue,
            quantityUnit,
            warningsJson: newWarnings.length > 0 ? newWarnings : null,
          })
          .where(eq(calculations.id, id));

        // Return updated calculation
        return {
          ...calculation,
          normalizedJson: updatedNormalized,
          ndcCandidatesJson:
            ndcCandidates && ndcCandidates.length > 0 ? ndcCandidates : null,
          selectedNdcJson: selectedNdc,
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

  // Check if NDC candidates need to be fetched (normalizedJson exists but ndcCandidatesJson is null)
  if (
    calculation.normalizedJson &&
    (!calculation.ndcCandidatesJson ||
      (Array.isArray(calculation.ndcCandidatesJson) &&
        calculation.ndcCandidatesJson.length === 0)) &&
    calculation.inputJson
  ) {
    const input = CalculatorInputSchema.safeParse(calculation.inputJson);
    if (input.success && input.data.drugOrNdc) {
      const normalized = calculation.normalizedJson as NormalizedSig;
      const existingWarnings: Warning[] = calculation.warningsJson
        ? (calculation.warningsJson as Warning[])
        : [];
      const newWarnings: Warning[] = [...existingWarnings];

      try {
        console.log(
          `[Loader] Fetching NDC candidates (lazy load) for: "${input.data.drugOrNdc}"`,
        );

        let ndcCandidates: NdcCandidate[] | null = null;

        // Try to fetch by RxNorm result if available
        if (normalized.rxcui && normalized.name) {
          const candidates = await searchFdaNdcByRxNorm(
            { rxcui: normalized.rxcui, name: normalized.name },
            100,
          );
          if (candidates.length > 0) {
            ndcCandidates = candidates;
            console.log(
              `[Loader] Found ${candidates.length} NDC candidates from FDA (lazy load)`,
            );
          }
        }

        // If no candidates from RxNorm search, try direct NDC search if input is an NDC
        if (
          (!ndcCandidates || ndcCandidates.length === 0) &&
          input.data.drugOrNdc
        ) {
          const ndcPattern = /^\d{4,5}-?\d{3,4}-?\d{1,2}$/;
          if (ndcPattern.test(input.data.drugOrNdc.replace(/\s/g, ""))) {
            const candidates = await searchFdaNdc({
              ndc: input.data.drugOrNdc,
            });
            if (candidates.length > 0) {
              ndcCandidates = candidates;
              console.log(
                `[Loader] Found ${candidates.length} NDC candidates from direct NDC search (lazy load)`,
              );
            }
          }
        }

        // If still no candidates, try searching by product name
        if (
          (!ndcCandidates || ndcCandidates.length === 0) &&
          input.data.drugOrNdc
        ) {
          const candidates = await searchFdaNdc({
            productName: input.data.drugOrNdc,
          });
          if (candidates.length > 0) {
            ndcCandidates = candidates;
            console.log(
              `[Loader] Found ${candidates.length} NDC candidates from product name search (lazy load)`,
            );
          }
        }

        // Add warning if no NDCs found
        if (!ndcCandidates || ndcCandidates.length === 0) {
          const hasMissingNdcWarning = existingWarnings.some(
            (w) => w.type === "missing_ndc",
          );
          if (!hasMissingNdcWarning) {
            newWarnings.push({
              type: "missing_ndc",
              severity: "warning",
              message: `No NDC candidates found for "${input.data.drugOrNdc}". The calculation may be incomplete.`,
              field: "drugOrNdc",
            });
          }
        }

        // Select optimal NDC using deterministic logic if candidates exist and no selection yet
        let selectedNdc: NdcCandidate | null = calculation.selectedNdcJson
          ? (calculation.selectedNdcJson as NdcCandidate)
          : null;

        if (!selectedNdc && ndcCandidates && ndcCandidates.length > 0) {
          console.log(
            `[Loader] Selecting optimal NDC from ${ndcCandidates.length} candidates (lazy load)`,
          );
          selectedNdc = selectOptimalNdc(
            ndcCandidates,
            normalized,
            input.data.daysSupply,
          );
          if (selectedNdc) {
            console.log(
              `[Loader] Selected NDC: ${selectedNdc.ndc} (${selectedNdc.productName})`,
            );
          }
        }

        // Update calculation in database
        await db
          .update(calculations)
          .set({
            ndcCandidatesJson:
              ndcCandidates && ndcCandidates.length > 0 ? ndcCandidates : null,
            selectedNdcJson: selectedNdc,
            warningsJson: newWarnings.length > 0 ? newWarnings : null,
          })
          .where(eq(calculations.id, id));

        // Return updated calculation
        return {
          ...calculation,
          ndcCandidatesJson:
            ndcCandidates && ndcCandidates.length > 0 ? ndcCandidates : null,
          selectedNdcJson: selectedNdc,
          warningsJson: newWarnings.length > 0 ? newWarnings : null,
        } as Calculation;
      } catch (error) {
        console.error("[Loader] FDA NDC search failed (lazy load):", error);
        const hasErrorWarning = existingWarnings.some(
          (w) =>
            w.type === "other" &&
            w.message.includes("Failed to fetch NDC candidates"),
        );
        if (!hasErrorWarning) {
          newWarnings.push({
            type: "other",
            severity: "warning",
            message:
              "Failed to fetch NDC candidates from FDA. The calculation may be incomplete.",
            field: "drugOrNdc",
          });
        }

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
          let updatedSelectedNdc =
            calculation.selectedNdcJson as NdcCandidate | null;

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
  const { page = 1, pageSize = 20, search, fromDate, toDate } = params;

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
