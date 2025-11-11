/**
 * Server-side data loaders for calculator feature.
 * These functions fetch and process calculation data.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calculations } from "@/server/db/calculator/schema";
import { CalculatorInputSchema } from "./schema";
import { parseSig, getPartialParseWarning } from "../utils/sigParser";
import { resolveToRxcui } from "./services/rxnorm";
import { computeQuantityWithWarnings } from "../utils/quantityMath";
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

  // Return calculation as-is (with proper type casting)
  return calculation as Calculation;
}
