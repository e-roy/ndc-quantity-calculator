/**
 * Deterministic NDC selection service.
 * Scores and ranks NDC candidates based on multiple factors to select the optimal match.
 */

import type { NdcCandidate, NormalizedSig } from "../../types";
import { parsePackageSize } from "../../utils/quantityMath";
import { calculateQuantity } from "../../utils/quantityMath";

/**
 * Scoring result for an NDC candidate.
 */
export type ScoredCandidate = NdcCandidate & {
  score: number; // Total score (0-1, higher is better)
  scoreBreakdown: {
    activeStatus: number; // 0 or 1 (1 if active)
    packageMatch: number; // 0-1 (how well package size matches calculated quantity)
    strengthMatch: number; // 0-1 (how well strength matches)
    unitMatch: number; // 0-1 (how well unit matches)
  };
};

/**
 * Normalizes a unit string for comparison.
 * Converts to lowercase and handles common variations.
 */
function normalizeUnitForMatch(unit: string | undefined): string {
  if (!unit) {
    return "";
  }
  return unit.toLowerCase().trim();
}

/**
 * Compares two units for similarity.
 * Returns 1 if exact match, 0.5 if similar (e.g., tablet/tab), 0 if no match.
 */
function compareUnits(
  unit1: string | undefined,
  unit2: string | undefined,
): number {
  if (!unit1 || !unit2) {
    return 0;
  }

  const norm1 = normalizeUnitForMatch(unit1);
  const norm2 = normalizeUnitForMatch(unit2);

  if (norm1 === norm2) {
    return 1;
  }

  // Check for common variations
  const variations: Record<string, string[]> = {
    tablet: ["tab", "tabs", "tablet", "tablets"],
    capsule: ["cap", "caps", "capsule", "capsules"],
    ml: ["ml", "milliliter", "milliliters", "millilitre", "millilitres"],
    mg: ["mg", "milligram", "milligrams"],
    unit: ["unit", "units"],
    puff: ["puff", "puffs"],
    spray: ["spray", "sprays"],
    drop: ["drop", "drops"],
  };

  for (const [, variants] of Object.entries(variations)) {
    if (variants.includes(norm1) && variants.includes(norm2)) {
      return 1;
    }
  }

  return 0;
}

/**
 * Compares strength strings for similarity.
 * Returns 1 if exact match, 0.5 if similar (e.g., "10mg" vs "10 mg"), 0 if no match.
 */
function compareStrengths(
  strength1: string | undefined,
  strength2: string | undefined,
): number {
  if (!strength1 || !strength2) {
    return 0;
  }

  // Normalize: remove spaces, convert to lowercase
  const norm1 = strength1.replace(/\s/g, "").toLowerCase();
  const norm2 = strength2.replace(/\s/g, "").toLowerCase();

  if (norm1 === norm2) {
    return 1;
  }

  // Try to extract numeric values and units
  const num1Regex = /(\d+(?:\.\d+)?)(\w+)?/;
  const num2Regex = /(\d+(?:\.\d+)?)(\w+)?/;
  const num1Match = num1Regex.exec(norm1);
  const num2Match = num2Regex.exec(norm2);

  if (num1Match && num2Match) {
    const num1 = Number.parseFloat(num1Match[1] ?? "0");
    const num2 = Number.parseFloat(num2Match[1] ?? "0");
    const unit1 = num1Match[2] ?? "";
    const unit2 = num2Match[2] ?? "";

    // If numbers match and units are similar
    if (Math.abs(num1 - num2) < 0.001 && compareUnits(unit1, unit2) > 0.5) {
      return 0.8; // Close match
    }
  }

  return 0;
}

/**
 * Calculates package size match score.
 * Returns 1 if package size exactly matches calculated quantity,
 * decreasing score as the difference increases.
 * Prefers packages that minimize waste (slightly over is better than way under).
 */
function calculatePackageMatchScore(
  calculatedQuantity: number | null,
  packageSize: number | null,
): number {
  if (!calculatedQuantity || !packageSize || packageSize <= 0) {
    return 0.5; // Neutral score if we can't compare
  }

  const ratio = calculatedQuantity / packageSize;

  // Exact match (within 1%)
  if (Math.abs(ratio - 1) < 0.01) {
    return 1.0;
  }

  // Perfect fit (exactly one package)
  if (Math.abs(ratio - 1) < 0.05) {
    return 0.95;
  }

  // Slightly over (1-1.2x) - acceptable, minimal waste
  if (ratio >= 1 && ratio <= 1.2) {
    return 0.9 - (ratio - 1) * 0.5; // 0.9 to 0.8
  }

  // Slightly under (0.8-1x) - acceptable, some waste
  if (ratio >= 0.8 && ratio < 1) {
    return 0.85 - (1 - ratio) * 0.5; // 0.85 to 0.8
  }

  // Multiple packages needed (1.2-2x) - acceptable
  if (ratio > 1.2 && ratio <= 2) {
    return 0.7 - (ratio - 1.2) * 0.2; // 0.7 to 0.54
  }

  // Way over (>2x) or way under (<0.8) - poor match
  if (ratio > 2) {
    return Math.max(0.3, 0.5 - (ratio - 2) * 0.1);
  }

  // Way under
  return Math.max(0.2, 0.4 - (0.8 - ratio) * 0.5);
}

/**
 * Scores a single NDC candidate.
 *
 * @param candidate - NDC candidate to score
 * @param normalizedSig - Normalized prescription SIG
 * @param daysSupply - Days supply from input
 * @returns Scored candidate with score and breakdown
 */
export function scoreNdcCandidate(
  candidate: NdcCandidate,
  normalizedSig: NormalizedSig | null,
  daysSupply: number | undefined,
): ScoredCandidate {
  const breakdown = {
    activeStatus: candidate.active ? 1 : 0,
    packageMatch: 0.5, // Default neutral score
    strengthMatch: 0,
    unitMatch: 0,
  };

  // Calculate package match score if we have quantity calculation
  if (normalizedSig && daysSupply) {
    const quantityResult = calculateQuantity(normalizedSig, daysSupply);
    if (quantityResult) {
      const packageSize = parsePackageSize(candidate.packageDescription);
      if (packageSize) {
        breakdown.packageMatch = calculatePackageMatchScore(
          quantityResult.quantityValue,
          packageSize.packageSize,
        );
      }
    }
  }

  // Compare strength if available
  if (normalizedSig?.strength && candidate.strength) {
    breakdown.strengthMatch = compareStrengths(
      normalizedSig.strength,
      candidate.strength,
    );
  } else if (!normalizedSig?.strength && !candidate.strength) {
    // Both missing - neutral
    breakdown.strengthMatch = 0.5;
  }

  // Compare units
  if (normalizedSig?.doseUnit && candidate.unit) {
    breakdown.unitMatch = compareUnits(normalizedSig.doseUnit, candidate.unit);
  } else if (!normalizedSig?.doseUnit && !candidate.unit) {
    // Both missing - neutral
    breakdown.unitMatch = 0.5;
  }

  // Calculate weighted total score
  // Weights: active status (30%), package match (40%), strength (15%), unit (15%)
  const totalScore =
    breakdown.activeStatus * 0.3 +
    breakdown.packageMatch * 0.4 +
    breakdown.strengthMatch * 0.15 +
    breakdown.unitMatch * 0.15;

  return {
    ...candidate,
    score: totalScore,
    scoreBreakdown: breakdown,
  };
}

/**
 * Selects the optimal NDC candidate from a list.
 * Scores all candidates and returns the highest-scoring one.
 *
 * @param candidates - Array of NDC candidates
 * @param normalizedSig - Normalized prescription SIG
 * @param daysSupply - Days supply from input
 * @returns Top-scoring candidate, or null if no candidates
 */
export function selectOptimalNdc(
  candidates: NdcCandidate[],
  normalizedSig: NormalizedSig | null,
  daysSupply: number | undefined,
): NdcCandidate | null {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Score all candidates
  const scoredCandidates = candidates.map((candidate) =>
    scoreNdcCandidate(candidate, normalizedSig, daysSupply),
  );

  // Sort by score (descending), then by active status, then by package match
  scoredCandidates.sort((a, b) => {
    // Primary: total score
    if (Math.abs(a.score - b.score) > 0.001) {
      return b.score - a.score;
    }

    // Secondary: active status
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    // Tertiary: package match
    return b.scoreBreakdown.packageMatch - a.scoreBreakdown.packageMatch;
  });

  // Return top candidate (without score breakdown for storage)
  const topCandidate = scoredCandidates[0];
  if (!topCandidate) {
    return null;
  }

  // Remove score and scoreBreakdown before returning (not part of NdcCandidate type)
  const {
    score: _score,
    scoreBreakdown: _scoreBreakdown,
    ...candidate
  } = topCandidate;
  return candidate;
}

/**
 * Ranks all NDC candidates by score.
 * Returns candidates sorted by score (highest first).
 *
 * @param candidates - Array of NDC candidates
 * @param normalizedSig - Normalized prescription SIG
 * @param daysSupply - Days supply from input
 * @returns Array of candidates sorted by score (highest first)
 */
export function rankNdcCandidates(
  candidates: NdcCandidate[],
  normalizedSig: NormalizedSig | null,
  daysSupply: number | undefined,
): NdcCandidate[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Score all candidates
  const scoredCandidates = candidates.map((candidate) =>
    scoreNdcCandidate(candidate, normalizedSig, daysSupply),
  );

  // Sort by score (descending)
  scoredCandidates.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.001) {
      return b.score - a.score;
    }
    // Tie-breaker: prefer active
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return 0;
  });

  // Return candidates without score breakdown
  return scoredCandidates.map(
    ({ score: _score, scoreBreakdown: _scoreBreakdown, ...candidate }) =>
      candidate,
  );
}
