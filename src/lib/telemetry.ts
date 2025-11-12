/**
 * Telemetry service for performance monitoring and logging.
 * Provides structured logging for operations, with special handling for slow queries.
 */

import { env } from "@/env";

const SLOW_QUERY_THRESHOLD_MS = 2000; // 2 seconds as per PRD requirement

export type PerformanceLogEntry = {
  operation: string;
  duration: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  isSlow?: boolean;
};

/**
 * Logs performance metrics for an operation.
 * In development, logs to console. In production, logs structured JSON.
 *
 * @param operation - Name of the operation (e.g., "rxnorm.resolve", "fda.search")
 * @param duration - Duration in milliseconds
 * @param metadata - Optional metadata about the operation
 */
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>,
): void {
  const isSlow = duration >= SLOW_QUERY_THRESHOLD_MS;
  const entry: PerformanceLogEntry = {
    operation,
    duration,
    metadata,
    timestamp: new Date(),
    isSlow,
  };

  if (env.NODE_ENV === "development") {
    // Development: human-readable console logs
    if (isSlow) {
      console.warn(
        `[PERF] SLOW QUERY: ${operation} took ${duration}ms`,
        metadata ? JSON.stringify(metadata, null, 2) : "",
      );
    } else {
      console.log(`[PERF] ${operation} took ${duration}ms`);
    }
  } else {
    // Production: structured JSON logging
    console.log(JSON.stringify(entry));
  }

  // If slow, also call the slow query logger
  if (isSlow) {
    logSlowQuery(operation, duration, metadata);
  }
}

/**
 * Logs slow queries that exceed the 2-second threshold.
 * Provides detailed information for performance debugging.
 *
 * @param operation - Name of the operation
 * @param duration - Duration in milliseconds
 * @param metadata - Optional metadata about the operation
 */
export function logSlowQuery(
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>,
): void {
  const entry = {
    type: "slow_query",
    operation,
    duration,
    threshold: SLOW_QUERY_THRESHOLD_MS,
    metadata,
    timestamp: new Date().toISOString(),
  };

  if (env.NODE_ENV === "development") {
    console.error(
      `[SLOW QUERY] ${operation} exceeded ${SLOW_QUERY_THRESHOLD_MS}ms threshold (${duration}ms)`,
      metadata ? JSON.stringify(metadata, null, 2) : "",
    );
  } else {
    // Production: structured JSON error log
    console.error(JSON.stringify(entry));
  }
}

/**
 * Wraps an async function with performance logging.
 * Automatically tracks execution time and logs the result.
 *
 * @param operation - Name of the operation
 * @param fn - Async function to wrap
 * @param metadata - Optional metadata to include in logs
 * @returns The result of the wrapped function
 */
export async function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance(operation, duration, metadata);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance(operation, duration, {
      ...metadata,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

