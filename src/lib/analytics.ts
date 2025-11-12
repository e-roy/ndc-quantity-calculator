/**
 * Analytics service for tracking metrics and success rates.
 * Records calculation metrics, performance data, and user feedback.
 */

import { db } from "@/lib/db";
import {
  performanceMetrics,
  calculationMetrics,
  userFeedback,
} from "@/server/db/metrics/schema";
import type { Calculation, NormalizedSig } from "@/features/calculator/types";

/**
 * Tracks a performance metric to the database.
 * Called automatically by telemetry service for operations exceeding threshold or on demand.
 *
 * @param operation - Name of the operation (e.g., "rxnorm.resolve")
 * @param duration - Duration in milliseconds
 * @param metadata - Optional metadata about the operation
 */
export async function trackPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(performanceMetrics).values({
      operation,
      duration: duration.toString(),
      metadata: metadata ?? null,
    });
  } catch (error) {
    // Log but don't throw - metrics collection should not break the app
    console.error("[Analytics] Failed to track performance:", error);
  }
}

/**
 * Tracks calculation metrics including success/failure and normalization accuracy.
 *
 * @param calculation - The calculation object to track
 * @param normalizedSig - Normalized SIG data (for determining normalization success)
 */
export async function trackCalculation(
  calculation: Calculation,
  normalizedSig: NormalizedSig | null,
): Promise<void> {
  try {
    // Determine normalization success status
    let normalizationSuccess: "success" | "failure" | "partial" | null = null;
    if (normalizedSig) {
      if (normalizedSig.rxcui) {
        normalizationSuccess = "success";
      } else {
        normalizationSuccess = "failure";
      }
    }

    // Count warnings
    const warningCount = calculation.warningsJson
      ? (calculation.warningsJson as unknown[]).length
      : 0;

    // Count NDC candidates
    const ndcCandidateCount = calculation.ndcCandidatesJson
      ? (calculation.ndcCandidatesJson as unknown[]).length
      : 0;

    await db.insert(calculationMetrics).values({
      calculationId: calculation.id,
      status: calculation.status,
      normalizationSuccess,
      hasRxCui: normalizedSig?.rxcui ? "true" : "false",
      ndcCandidateCount: ndcCandidateCount > 0 ? ndcCandidateCount.toString() : null,
      warningCount: warningCount > 0 ? warningCount.toString() : null,
      metadata: {
        hasSelectedNdc: !!calculation.selectedNdcJson,
        hasQuantity: !!calculation.quantityValue,
      },
    });
  } catch (error) {
    // Log but don't throw - metrics collection should not break the app
    console.error("[Analytics] Failed to track calculation:", error);
  }
}

/**
 * Records user feedback (satisfaction rating).
 *
 * @param calculationId - ID of the calculation being rated
 * @param rating - Rating from 1 to 5
 * @param feedbackText - Optional feedback text
 * @param userId - Optional user ID (may be null for anonymous feedback)
 */
export async function recordFeedback(
  calculationId: string,
  rating: number,
  feedbackText?: string,
  userId?: string | null,
): Promise<void> {
  try {
    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error("Rating must be an integer between 1 and 5");
    }

    await db.insert(userFeedback).values({
      calculationId,
      userId: userId ?? null,
      rating: rating.toString(),
      feedbackText: feedbackText ?? null,
    });
  } catch (error) {
    // Log but don't throw - feedback collection should not break the app
    console.error("[Analytics] Failed to record feedback:", error);
    throw error; // Re-throw for validation errors so UI can handle them
  }
}

/**
 * Calculates normalization accuracy rate.
 * Returns the percentage of successful RxCUI resolutions.
 *
 * @param fromDate - Optional start date for the calculation period
 * @param toDate - Optional end date for the calculation period
 * @returns Normalization accuracy rate (0-100) or null if no data
 */
export async function getNormalizationAccuracy(
  fromDate?: Date,
  toDate?: Date,
): Promise<number | null> {
  try {
    const { sql, and, gte, lte } = await import("drizzle-orm");
    const { count } = await import("drizzle-orm");

    // Build where conditions
    const conditions = [];
    if (fromDate) {
      conditions.push(gte(calculationMetrics.createdAt, fromDate));
    }
    if (toDate) {
      conditions.push(lte(calculationMetrics.createdAt, toDate));
    }

    // Get total calculations with normalization attempts
    const totalResult = await db
      .select({ count: count() })
      .from(calculationMetrics)
      .where(
        conditions.length > 0
          ? and(...conditions)
          : undefined,
      );

    const total = totalResult[0]?.count ?? 0;
    if (total === 0) {
      return null;
    }

    // Get successful normalizations
    const successResult = await db
      .select({ count: count() })
      .from(calculationMetrics)
      .where(
        conditions.length > 0
          ? and(
              ...conditions,
              sql`${calculationMetrics.normalizationSuccess} = 'success'`,
            )
          : sql`${calculationMetrics.normalizationSuccess} = 'success'`,
      );

    const success = successResult[0]?.count ?? 0;

    // Calculate accuracy rate (percentage)
    return total > 0 ? Math.round((success / total) * 100) : null;
  } catch (error) {
    console.error("[Analytics] Failed to calculate normalization accuracy:", error);
    return null;
  }
}

/**
 * Gets average user satisfaction rating.
 *
 * @param fromDate - Optional start date for the calculation period
 * @param toDate - Optional end date for the calculation period
 * @returns Average rating (1-5) or null if no feedback
 */
export async function getAverageSatisfactionRating(
  fromDate?: Date,
  toDate?: Date,
): Promise<number | null> {
  try {
    const { sql, and, gte, lte, avg } = await import("drizzle-orm");

    // Build where conditions
    const conditions = [];
    if (fromDate) {
      conditions.push(gte(userFeedback.createdAt, fromDate));
    }
    if (toDate) {
      conditions.push(lte(userFeedback.createdAt, toDate));
    }

    const result = await db
      .select({
        avgRating: sql<number>`AVG(${userFeedback.rating}::numeric)`,
      })
      .from(userFeedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const avgRating = result[0]?.avgRating;
    return avgRating ? Math.round(avgRating * 10) / 10 : null; // Round to 1 decimal place
  } catch (error) {
    console.error("[Analytics] Failed to get average satisfaction rating:", error);
    return null;
  }
}

