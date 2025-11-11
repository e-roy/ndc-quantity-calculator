import { z } from "zod";

/**
 * Schema for calculator input form validation.
 * Used by both client and server for consistent validation.
 */
export const CalculatorInputSchema = z.object({
  drugOrNdc: z.string().min(1, "Drug name or NDC is required"),
  sig: z.string().min(1, "SIG (prescription instructions) is required"),
  daysSupply: z
    .number({
      required_error: "Days supply is required",
      invalid_type_error: "Days supply must be a number",
    })
    .int("Days supply must be a whole number")
    .positive("Days supply must be greater than 0")
    .max(365, "Days supply cannot exceed 365 days"),
});

export type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

