import { z } from "zod";

/**
 * Domain types for the calculator feature.
 * These types represent the core data structures used throughout the calculator.
 */

/**
 * Status of a calculation record.
 */
export type CalculationStatus = "pending" | "ready" | "error";

/**
 * Normalized SIG (prescription instructions) structure.
 * Represents parsed and standardized prescription instructions.
 * Phase 6: Extended with RxNorm resolution (rxcui, name, strength, form).
 */
export const NormalizedSigSchema = z.object({
  rxcui: z.string().optional(), // RxNorm concept ID
  name: z.string().optional(), // Resolved medication name from RxNorm
  strength: z.string().optional(), // Medication strength (e.g., "10mg", "5mg/5ml")
  form: z.string().optional(), // Dosage form (e.g., "TABLET", "CAPSULE", "SOLUTION")
  dose: z.number().optional(), // Numeric dose value (e.g., 1, 2, 10)
  doseUnit: z.string().optional(), // Unit of dose (e.g., "tablet", "ml", "mg", "capsule")
  frequencyPerDay: z.number().optional(), // Frequency per day (e.g., 1, 2, 3, 4)
  route: z.string().optional(), // Route of administration (e.g., "oral", "topical", "injection")
});

export type NormalizedSig = z.infer<typeof NormalizedSigSchema>;

/**
 * NDC candidate from FDA directory lookup.
 * Represents a potential NDC match for the prescription.
 */
export const NdcCandidateSchema = z.object({
  ndc: z.string(), // 11-digit NDC code
  labelerName: z.string().optional(),
  productName: z.string(),
  packageDescription: z.string().optional(),
  strength: z.string().optional(), // e.g., "10mg", "5mg/5ml"
  unit: z.string().optional(), // e.g., "TABLET", "CAPSULE", "ML"
  active: z.boolean().default(true),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string (null if active)
  rxCui: z.string().optional(), // RxNorm concept ID
  matchScore: z.number().optional(), // AI/ranking score if applicable
});

export type NdcCandidate = z.infer<typeof NdcCandidateSchema>;

/**
 * Warning or alert generated during calculation.
 * Indicates issues like inactive NDC, overfill, underfill, etc.
 */
export const WarningSchema = z.object({
  type: z.enum([
    "inactive_ndc",
    "overfill",
    "underfill",
    "strength_mismatch",
    "unit_mismatch",
    "missing_ndc",
    "invalid_sig",
    "unresolved_rxcui",
    "other",
  ]),
  severity: z.enum(["error", "warning", "info"]).default("warning"),
  message: z.string(),
  field: z.string().optional(), // Field that triggered the warning
  details: z.record(z.unknown()).optional(), // Additional context
});

export type Warning = z.infer<typeof WarningSchema>;

/**
 * Complete calculation record type.
 * Represents a persisted calculation with all its data.
 */
export const CalculationSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  status: z.enum(["pending", "ready", "error"]),
  inputJson: z.record(z.unknown()).nullable(), // CalculatorInput
  normalizedJson: NormalizedSigSchema.nullable(),
  ndcCandidatesJson: z.array(NdcCandidateSchema).nullable(),
  selectedNdcJson: NdcCandidateSchema.nullable(),
  quantityValue: z.string().nullable(), // numeric as string from DB
  quantityUnit: z.string().nullable(),
  warningsJson: z.array(WarningSchema).nullable(),
  aiNotes: z.string().nullable(),
  userId: z.string().uuid().nullable(),
});

export type Calculation = z.infer<typeof CalculationSchema>;

/**
 * Helper type for creating a new calculation (without id, createdAt).
 */
export type CalculationInput = Omit<Calculation, "id" | "createdAt">;

/**
 * Helper type for calculation results (ready status with all data).
 */
export type CalculationResult = Calculation & {
  status: "ready";
  quantityValue: string;
  quantityUnit: string;
  selectedNdcJson: NdcCandidate;
};
