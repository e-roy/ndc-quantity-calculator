"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { calculations } from "@/server/db/calculator/schema";
import { CalculatorInputSchema, type CalculatorInput } from "./schema";

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
