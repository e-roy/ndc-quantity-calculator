/**
 * SIG (prescription instructions) parser.
 * Parses prescription instructions to extract dose, doseUnit, frequencyPerDay, and route.
 * This is a deterministic parser that handles common SIG patterns.
 */

import type { NormalizedSig } from "../types";

/**
 * Unit normalization map: maps common unit variations to standardized forms.
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
  // Liquid volume units (for conversion)
  teaspoon: "ml", // 1 tsp = ~5ml
  tsp: "ml",
  teaspoons: "ml",
  tsps: "ml",
  tablespoon: "ml", // 1 tbsp = ~15ml
  tbsp: "ml",
  tablespoons: "ml",
  cup: "ml", // 1 cup = ~240ml
  cups: "ml",
  oz: "ml", // 1 oz = ~30ml (fluid ounce)
  ounce: "ml",
  ounces: "ml",
  "fl oz": "ml",
  "fluid ounce": "ml",
  "fluid ounces": "ml",
};

/**
 * Frequency patterns: maps common frequency abbreviations to times per day.
 */
const FREQUENCY_PATTERNS: Record<string, number> = {
  qd: 1, // once daily
  qday: 1,
  "once daily": 1,
  "once a day": 1,
  "1x daily": 1,
  "1xday": 1,
  bid: 2, // twice daily
  "twice daily": 2,
  "twice a day": 2,
  "2x daily": 2,
  "2xday": 2,
  tid: 3, // three times daily
  "three times daily": 3,
  "three times a day": 3,
  "3x daily": 3,
  "3xday": 3,
  qid: 4, // four times daily
  "four times daily": 4,
  "four times a day": 4,
  "4x daily": 4,
  "4xday": 4,
  q6h: 4, // every 6 hours
  q8h: 3, // every 8 hours
  q12h: 2, // every 12 hours
  q4h: 6, // every 4 hours
  q2h: 12, // every 2 hours
  "every 6 hours": 4,
  "every 8 hours": 3,
  "every 12 hours": 2,
  "every 4 hours": 6,
  "every 2 hours": 12,
};

/**
 * Route patterns: maps common route descriptions to standardized forms.
 */
const ROUTE_PATTERNS: Record<string, string> = {
  oral: "oral",
  "by mouth": "oral",
  po: "oral",
  "p.o.": "oral",
  topical: "topical",
  apply: "topical",
  injection: "injection",
  inject: "injection",
  im: "injection",
  "i.m.": "injection",
  iv: "injection",
  "i.v.": "injection",
  sublingual: "sublingual",
  sl: "sublingual",
  nasal: "nasal",
  ophthalmic: "ophthalmic",
  otic: "otic",
  rectal: "rectal",
  vaginal: "vaginal",
  inhalation: "inhalation",
  inhale: "inhalation",
};

/**
 * Normalizes a unit string to a standard form.
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return UNIT_NORMALIZATION[normalized] ?? normalized;
}

/**
 * Extracts frequency per day from SIG text.
 */
function extractFrequencyPerDay(sig: string): number | undefined {
  const lowerSig = sig.toLowerCase();

  // Check for explicit frequency patterns
  for (const [pattern, frequency] of Object.entries(FREQUENCY_PATTERNS)) {
    if (lowerSig.includes(pattern)) {
      return frequency;
    }
  }

  // Check for "X times per day" or "X times daily" patterns
  const timesPerDayRegex = /(\d+)\s*(?:times?|x)\s*(?:per\s*day|daily|a\s*day)/;
  const timesPerDayMatch = timesPerDayRegex.exec(lowerSig);
  if (timesPerDayMatch) {
    const freq = Number.parseInt(timesPerDayMatch[1] ?? "", 10);
    if (!Number.isNaN(freq) && freq > 0 && freq <= 12) {
      return freq;
    }
  }

  // Check for "every X hours" pattern
  const everyHoursRegex = /every\s*(\d+)\s*hours?/;
  const everyHoursMatch = everyHoursRegex.exec(lowerSig);
  if (everyHoursMatch) {
    const hours = Number.parseInt(everyHoursMatch[1] ?? "", 10);
    if (!Number.isNaN(hours) && hours > 0 && hours <= 24) {
      // Calculate frequency per day (24 / hours, rounded)
      return Math.round(24 / hours);
    }
  }

  return undefined;
}

/**
 * Extracts route from SIG text.
 */
function extractRoute(sig: string): string | undefined {
  const lowerSig = sig.toLowerCase();

  for (const [pattern, route] of Object.entries(ROUTE_PATTERNS)) {
    if (lowerSig.includes(pattern)) {
      return route;
    }
  }

  return undefined;
}

/**
 * Extracts dose and doseUnit from SIG text.
 * Handles patterns like "1 tablet", "2 tabs", "10mg", "5 ml", etc.
 */
function extractDoseAndUnit(sig: string): {
  dose: number | undefined;
  doseUnit: string | undefined;
} {
  // Pattern 1: "X unit" or "X units" (e.g., "1 tablet", "2 tabs", "5 ml")
  const unitPattern = /(\d+(?:\.\d+)?)\s+([a-z]+(?:s)?)\b/gi;
  const unitMatch = unitPattern.exec(sig);
  if (unitMatch) {
    // Take the first match (usually the dose)
    const match = unitMatch[0];
    const parts = match.split(/\s+/);
    if (parts.length >= 2) {
      const doseNum = Number.parseFloat(parts[0] ?? "");
      const unit = parts.slice(1).join(" ");
      if (!Number.isNaN(doseNum) && unit) {
        return {
          dose: doseNum,
          doseUnit: normalizeUnit(unit),
        };
      }
    }
  }

  // Pattern 2: "Xmg", "Xml", etc. (no space)
  const noSpacePattern =
    /(\d+(?:\.\d+)?)\s*(mg|ml|g|l|unit|units|tab|tabs|cap|caps)\b/gi;
  const noSpaceMatch = noSpacePattern.exec(sig);
  if (noSpaceMatch) {
    const match = noSpaceMatch[0];
    const doseRegex = /(\d+(?:\.\d+)?)/;
    const doseMatch = doseRegex.exec(match);
    const unitRegex = /([a-z]+)/i;
    const unitMatch = unitRegex.exec(match);
    if (doseMatch && unitMatch) {
      const doseNum = Number.parseFloat(doseMatch[1] ?? "");
      const unit = unitMatch[1];
      if (!Number.isNaN(doseNum) && unit) {
        return {
          dose: doseNum,
          doseUnit: normalizeUnit(unit),
        };
      }
    }
  }

  // Pattern 3: Just a number at the start (assume it's the dose, try to infer unit from context)
  const numberAtStart = /^(\d+(?:\.\d+)?)/;
  const numberMatch = numberAtStart.exec(sig);
  if (numberMatch) {
    const doseNum = Number.parseFloat(numberMatch[1] ?? "");
    if (!Number.isNaN(doseNum)) {
      // Try to find a unit nearby
      const afterNumber = sig.slice(numberMatch[0]?.length ?? 0);
      const unitRegex = /\b([a-z]+(?:s)?)\b/i;
      const unitMatch = unitRegex.exec(afterNumber);
      if (unitMatch) {
        return {
          dose: doseNum,
          doseUnit: normalizeUnit(unitMatch[1] ?? ""),
        };
      }
      // If no unit found, return just the dose
      return {
        dose: doseNum,
        doseUnit: undefined,
      };
    }
  }

  return { dose: undefined, doseUnit: undefined };
}

/**
 * Detects special dosage form from SIG text and parsed data.
 * Returns form type: "liquid", "insulin", "inhaler", or undefined.
 */
function detectDosageForm(
  sig: string,
  doseUnit: string | undefined,
  route: string | undefined,
): "liquid" | "insulin" | "inhaler" | undefined {
  const lowerSig = sig.toLowerCase();
  const lowerUnit = doseUnit?.toLowerCase() ?? "";

  // Detect inhaler (puffs, sprays, inhalation route)
  if (
    route === "inhalation" ||
    lowerSig.includes("inhal") ||
    lowerUnit === "puff" ||
    lowerUnit === "spray"
  ) {
    return "inhaler";
  }

  // Detect insulin (units, insulin keyword)
  if (
    lowerUnit === "unit" ||
    lowerSig.includes("insulin") ||
    lowerSig.includes("units")
  ) {
    // Additional check: if it's clearly insulin context
    if (lowerSig.includes("insulin") || (lowerUnit === "unit" && lowerSig.includes("subcutaneous"))) {
      return "insulin";
    }
  }

  // Detect liquid (ml, teaspoon, tablespoon, etc.)
  if (
    lowerUnit === "ml" ||
    lowerUnit === "l" ||
    lowerSig.includes("teaspoon") ||
    lowerSig.includes("tsp") ||
    lowerSig.includes("tablespoon") ||
    lowerSig.includes("tbsp") ||
    lowerSig.includes("ounce") ||
    lowerSig.includes("fl oz") ||
    route === "oral" && (lowerUnit === "ml" || lowerUnit === "l")
  ) {
    return "liquid";
  }

  return undefined;
}

/**
 * Parses a SIG string and returns normalized values.
 * Returns partial results if some fields cannot be parsed.
 * Detects special dosage forms (liquid, insulin, inhaler).
 */
export function parseSig(sig: string): NormalizedSig {
  const trimmedSig = sig.trim();

  if (!trimmedSig) {
    return {};
  }

  const { dose, doseUnit } = extractDoseAndUnit(trimmedSig);
  const frequencyPerDay = extractFrequencyPerDay(trimmedSig);
  const route = extractRoute(trimmedSig);

  // Detect dosage form
  const form = detectDosageForm(trimmedSig, doseUnit, route);

  return {
    dose,
    doseUnit,
    frequencyPerDay,
    route,
    dosageForm: form, // Add detected dosage form to normalized SIG
  };
}

/**
 * Determines if a parsed SIG is complete or partial.
 * Complete means we have at least dose and frequencyPerDay.
 */
export function isSigComplete(parsed: NormalizedSig): boolean {
  return (
    parsed.dose !== undefined &&
    parsed.doseUnit !== undefined &&
    parsed.frequencyPerDay !== undefined
  );
}

/**
 * Generates a warning message for partial SIG parses.
 */
export function getPartialParseWarning(
  parsed: NormalizedSig,
): string | undefined {
  const missing: string[] = [];

  if (parsed.dose === undefined) {
    missing.push("dose");
  }
  if (parsed.doseUnit === undefined) {
    missing.push("dose unit");
  }
  if (parsed.frequencyPerDay === undefined) {
    missing.push("frequency");
  }

  if (missing.length > 0) {
    return `Could not parse ${missing.join(", ")} from SIG. Some calculations may be incomplete.`;
  }

  return undefined;
}
