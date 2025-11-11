"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { calculations } from "@/server/db/calculator/schema";
import { CalculatorInputSchema, type CalculatorInput } from "./schema";
import { getCalculationById } from "./loaders";
import type { Calculation } from "../types";

/**
 * Server action to create a new calculation.
 * Validates input, inserts into database, and redirects to the results page.
 */
export async function createCalculation(
  input: CalculatorInput,
): Promise<never> {
  // Validate input on server side
  const validatedInput = CalculatorInputSchema.parse(input);

  // Insert new calculation with status 'pending'
  const [result] = await db
    .insert(calculations)
    .values({
      status: "pending",
      inputJson: validatedInput,
    })
    .returning({ id: calculations.id });

  // Ensure we got a result (should always happen, but TypeScript needs this check)
  if (!result) {
    throw new Error("Failed to create calculation: no result returned");
  }

  // Redirect to the results page
  redirect(`/calculator/${result.id}`);
}

/**
 * Escapes a CSV field value, handling quotes and commas.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  // Handle objects and arrays by stringifying them
  // Note: typeof null === "object" in JavaScript, but we already checked for null above
  let str: string;
  if (typeof value === "object") {
    str = JSON.stringify(value);
  } else if (typeof value === "string") {
    str = value;
  } else if (typeof value === "number" || typeof value === "boolean") {
    str = String(value);
  } else if (typeof value === "bigint") {
    str = value.toString();
  } else {
    // Fallback for other types (symbol, function, etc.) - use JSON.stringify to avoid [object Object]
    str = JSON.stringify(value);
  }
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes a calculation to CSV format.
 * Flattens all fields including warnings.
 */
function serializeCalculationToCsv(calculation: Calculation): string {
  const input = calculation.inputJson
    ? CalculatorInputSchema.safeParse(calculation.inputJson)
    : null;
  const normalized = calculation.normalizedJson;
  const selectedNdc = calculation.selectedNdcJson;
  const warnings = calculation.warningsJson;

  // Build CSV row
  const fields: string[] = [
    // Core fields
    escapeCsvField(calculation.id),
    escapeCsvField(calculation.createdAt.toISOString()),
    escapeCsvField(calculation.status),
    // Input fields
    escapeCsvField(input?.success ? input.data.sig : null),
    escapeCsvField(input?.success ? input.data.drugOrNdc : null),
    escapeCsvField(input?.success ? input.data.daysSupply : null),
    // Normalized fields
    escapeCsvField(normalized?.rxcui ?? null),
    escapeCsvField(normalized?.name ?? null),
    escapeCsvField(normalized?.strength ?? null),
    escapeCsvField(normalized?.form ?? null),
    escapeCsvField(normalized?.dose ?? null),
    escapeCsvField(normalized?.doseUnit ?? null),
    escapeCsvField(normalized?.frequencyPerDay ?? null),
    escapeCsvField(normalized?.route ?? null),
    // NDC fields
    escapeCsvField(selectedNdc?.ndc ?? null),
    escapeCsvField(selectedNdc?.productName ?? null),
    escapeCsvField(selectedNdc?.labelerName ?? null),
    escapeCsvField(selectedNdc?.active ?? null),
    escapeCsvField(selectedNdc?.strength ?? null),
    escapeCsvField(selectedNdc?.unit ?? null),
    // Quantity fields
    escapeCsvField(calculation.quantityValue ?? null),
    escapeCsvField(calculation.quantityUnit ?? null),
    // Warnings
    escapeCsvField(warnings?.length ?? 0),
  ];

  // Add warning details (up to 5 warnings)
  const maxWarnings = 5;
  for (let i = 0; i < maxWarnings; i++) {
    const warning = warnings?.[i];
    fields.push(escapeCsvField(warning?.type ?? null));
    fields.push(escapeCsvField(warning?.severity ?? null));
    fields.push(escapeCsvField(warning?.message ?? null));
    fields.push(escapeCsvField(warning?.field ?? null));
  }

  return fields.join(",");
}

/**
 * Generates CSV header row.
 */
function generateCsvHeader(): string {
  const headers = [
    // Core fields
    "id",
    "createdAt",
    "status",
    // Input fields
    "sig",
    "drugOrNdc",
    "daysSupply",
    // Normalized fields
    "rxcui",
    "normalized_name",
    "normalized_strength",
    "normalized_form",
    "dose",
    "doseUnit",
    "frequencyPerDay",
    "route",
    // NDC fields
    "ndc",
    "productName",
    "labelerName",
    "ndc_active",
    "ndc_strength",
    "ndc_unit",
    // Quantity fields
    "quantityValue",
    "quantityUnit",
    // Warnings
    "warning_count",
  ];

  // Add warning detail columns (up to 5 warnings)
  const maxWarnings = 5;
  for (let i = 1; i <= maxWarnings; i++) {
    headers.push(`warning_${i}_type`);
    headers.push(`warning_${i}_severity`);
    headers.push(`warning_${i}_message`);
    headers.push(`warning_${i}_field`);
  }

  return headers.join(",");
}

/**
 * Server action to export a calculation as JSON or CSV.
 * Returns a Response object for file download.
 */
export async function exportCalculation(
  id: string,
  format: "json" | "csv",
): Promise<Response> {
  // Fetch calculation
  const calculation = await getCalculationById(id);

  if (!calculation) {
    throw new Error("Calculation not found");
  }

  if (format === "json") {
    // Export as JSON
    const jsonString = JSON.stringify(calculation, null, 2);
    return new Response(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${id}-calculation.json"`,
      },
    });
  } else {
    // Export as CSV
    const header = generateCsvHeader();
    const row = serializeCalculationToCsv(calculation);
    const csvString = `${header}\n${row}`;

    return new Response(csvString, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${id}-calculation.csv"`,
      },
    });
  }
}
