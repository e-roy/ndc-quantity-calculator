/**
 * Quantity calculation utilities.
 * Computes dispense quantities from normalized SIG and days supply.
 * Detects overfill/underfill vs package size.
 */

import type { NormalizedSig, NdcCandidate, Warning } from "../types";

/**
 * Unit normalization map: maps common unit variations to standardized singular forms.
 * Used for matching units between SIG and package descriptions.
 */
const UNIT_NORMALIZATION: Record<string, string> = {
  // Tablets
  tab: "tablet",
  tabs: "tablet",
  tablet: "tablet",
  tablets: "tablet",
  // Capsules
  cap: "capsule",
  caps: "capsule",
  capsule: "capsule",
  capsules: "capsule",
  // Liquid units
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  // Weight units
  mg: "mg",
  milligram: "mg",
  milligrams: "mg",
  g: "g",
  gram: "g",
  grams: "g",
  // Other common units
  unit: "unit",
  units: "unit",
  drop: "drop",
  drops: "drop",
  puff: "puff",
  puffs: "puff",
  spray: "spray",
  sprays: "spray",
};

/**
 * Normalizes a unit string to a standard singular form.
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return UNIT_NORMALIZATION[normalized] ?? normalized;
}

/**
 * Result of quantity calculation.
 */
export type QuantityResult = {
  quantityValue: number;
  quantityUnit: string;
} | null;

/**
 * Calculates dispense quantity from normalized SIG and days supply.
 * Formula: quantity = dose × frequencyPerDay × daysSupply
 *
 * @param normalizedSig - Normalized SIG with dose, doseUnit, and frequencyPerDay
 * @param daysSupply - Number of days the prescription should last
 * @returns Quantity result with value and unit, or null if insufficient data
 */
export function calculateQuantity(
  normalizedSig: NormalizedSig | null,
  daysSupply: number,
): QuantityResult {
  if (!normalizedSig) {
    return null;
  }

  const { dose, doseUnit, frequencyPerDay } = normalizedSig;

  // Require dose, doseUnit, and frequencyPerDay for calculation
  if (
    dose === undefined ||
    doseUnit === undefined ||
    frequencyPerDay === undefined
  ) {
    return null;
  }

  // Require valid numeric values
  if (
    !Number.isFinite(dose) ||
    !Number.isFinite(frequencyPerDay) ||
    !Number.isFinite(daysSupply) ||
    dose <= 0 ||
    frequencyPerDay <= 0 ||
    daysSupply <= 0
  ) {
    return null;
  }

  // Calculate quantity
  const quantityValue = dose * frequencyPerDay * daysSupply;

  // Normalize unit to singular form
  const quantityUnit = normalizeUnit(doseUnit);

  return {
    quantityValue,
    quantityUnit,
  };
}

/**
 * Parsed package size from package description.
 */
export type PackageSize = {
  packageSize: number;
  packageUnit: string;
} | null;

/**
 * Parses package size from NDC package description.
 * Handles patterns like "30 TABLET in 1 BOTTLE", "100 ML in 1 BOTTLE", etc.
 *
 * @param packageDescription - Package description string from NDC data
 * @returns Parsed package size and unit, or null if parsing fails
 */
export function parsePackageSize(
  packageDescription: string | undefined,
): PackageSize {
  if (!packageDescription) {
    return null;
  }

  // Pattern: "X UNIT in 1 CONTAINER" or "X UNIT in CONTAINER"
  // Examples: "30 TABLET in 1 BOTTLE", "100 ML in 1 BOTTLE", "60 CAPSULE in 1 BOTTLE"
  const pattern = /(\d+)\s+([A-Za-z]+)\s+in\s+\d+\s+[A-Za-z]+/i;
  const match = pattern.exec(packageDescription);

  if (!match) {
    return null;
  }

  const packageSize = Number.parseInt(match[1] ?? "", 10);
  const packageUnitRaw = match[2];

  if (Number.isNaN(packageSize) || packageSize <= 0 || !packageUnitRaw) {
    return null;
  }

  // Normalize unit to singular form
  const packageUnit = normalizeUnit(packageUnitRaw);

  return {
    packageSize,
    packageUnit,
  };
}

/**
 * Detects overfill/underfill warnings by comparing calculated quantity vs package size.
 * Thresholds: OVERFILL if >5% over, UNDERFILL if <5% under.
 *
 * @param quantityValue - Calculated quantity value
 * @param quantityUnit - Calculated quantity unit
 * @param packageSize - Package size (if available)
 * @returns Array of warnings (empty if no issues)
 */
export function detectOverfillUnderfill(
  quantityValue: number,
  quantityUnit: string,
  packageSize: PackageSize,
): Warning[] {
  const warnings: Warning[] = [];

  if (!packageSize) {
    return warnings;
  }

  // Check if units match (case-insensitive, normalized)
  const normalizedQuantityUnit = normalizeUnit(quantityUnit);
  const normalizedPackageUnit = normalizeUnit(packageSize.packageUnit);

  if (normalizedQuantityUnit !== normalizedPackageUnit) {
    // Units don't match - can't compare, but this is handled by unit_mismatch warning elsewhere
    return warnings;
  }

  const calculatedQuantity = quantityValue;
  const packageQuantity = packageSize.packageSize;

  // Calculate thresholds (5% tolerance)
  const overfillThreshold = packageQuantity * 1.05;
  const underfillThreshold = packageQuantity * 0.95;

  // Check for overfill (>5% over package size)
  if (calculatedQuantity > overfillThreshold) {
    const excess = calculatedQuantity - packageQuantity;
    const excessPercent = ((excess / packageQuantity) * 100).toFixed(1);
    warnings.push({
      type: "overfill",
      severity: "warning",
      message: `Calculated quantity (${calculatedQuantity.toFixed(1)} ${quantityUnit}) exceeds package size (${packageQuantity} ${packageSize.packageUnit}) by ${excessPercent}%. Consider using multiple packages or adjusting days supply.`,
      field: "quantity",
      details: {
        calculatedQuantity,
        packageQuantity,
        excess,
        excessPercent: Number.parseFloat(excessPercent),
      },
    });
  }

  // Check for underfill (<5% under package size)
  if (calculatedQuantity < underfillThreshold) {
    const shortage = packageQuantity - calculatedQuantity;
    const shortagePercent = ((shortage / packageQuantity) * 100).toFixed(1);
    warnings.push({
      type: "underfill",
      severity: "warning",
      message: `Calculated quantity (${calculatedQuantity.toFixed(1)} ${quantityUnit}) is ${shortagePercent}% less than package size (${packageQuantity} ${packageSize.packageUnit}). This may result in waste.`,
      field: "quantity",
      details: {
        calculatedQuantity,
        packageQuantity,
        shortage,
        shortagePercent: Number.parseFloat(shortagePercent),
      },
    });
  }

  return warnings;
}

/**
 * Computes quantity and detects overfill/underfill warnings.
 * Convenience function that combines calculation, package parsing, and warning detection.
 *
 * @param normalizedSig - Normalized SIG
 * @param daysSupply - Days supply
 * @param selectedNdc - Selected NDC candidate (optional, for package size comparison)
 * @returns Object with quantity result, package size, and warnings
 */
export function computeQuantityWithWarnings(
  normalizedSig: NormalizedSig | null,
  daysSupply: number,
  selectedNdc: NdcCandidate | null,
): {
  quantity: QuantityResult;
  packageSize: PackageSize;
  warnings: Warning[];
} {
  // Calculate quantity
  const quantity = calculateQuantity(normalizedSig, daysSupply);

  // Parse package size if NDC is available
  const packageSize = selectedNdc
    ? parsePackageSize(selectedNdc.packageDescription)
    : null;

  // Detect overfill/underfill if we have both quantity and package size
  const warnings: Warning[] = [];
  if (quantity && packageSize) {
    const overfillUnderfillWarnings = detectOverfillUnderfill(
      quantity.quantityValue,
      quantity.quantityUnit,
      packageSize,
    );
    warnings.push(...overfillUnderfillWarnings);
  }

  return {
    quantity,
    packageSize,
    warnings,
  };
}

