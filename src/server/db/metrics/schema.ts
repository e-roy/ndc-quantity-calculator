import { index, pgTableCreator, numeric, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

/**
 * Table creator for metrics tables.
 */
export const createMetricsTable = pgTableCreator((name) => name);

/**
 * Performance metrics table for tracking API response times and operation durations.
 */
export const performanceMetrics = createMetricsTable(
  "performance_metric",
  (d) => ({
    id: d
      .uuid()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    operation: d.text("operation").notNull(), // e.g., "rxnorm.resolve", "fda.search"
    duration: d.numeric("duration", { precision: 10, scale: 2 }).notNull(), // Duration in milliseconds
    metadata: d.jsonb("metadata"), // Additional context (operation-specific data)
  }),
  (t) => [
    index("performance_metric_operation_idx").on(t.operation),
    index("performance_metric_created_at_idx").on(t.createdAt),
  ],
);

/**
 * Calculation metrics table for tracking calculation success/failure and normalization accuracy.
 */
export const calculationMetrics = createMetricsTable(
  "calculation_metric",
  (d) => ({
    id: d
      .uuid()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    calculationId: d.uuid("calculation_id").notNull(),
    status: d.text("status").$type<"ready" | "error" | "pending">().notNull(),
    normalizationSuccess: d.text("normalization_success").$type<"success" | "failure" | "partial">(), // RxCUI resolution status
    hasRxCui: d.text("has_rxcui").$type<"true" | "false">(), // Whether RxCUI was resolved
    ndcCandidateCount: d.numeric("ndc_candidate_count"), // Number of NDC candidates found
    warningCount: d.numeric("warning_count"), // Number of warnings generated
    metadata: d.jsonb("metadata"), // Additional calculation context
  }),
  (t) => [
    index("calculation_metric_calculation_id_idx").on(t.calculationId),
    index("calculation_metric_status_idx").on(t.status),
    index("calculation_metric_created_at_idx").on(t.createdAt),
    index("calculation_metric_normalization_success_idx").on(t.normalizationSuccess),
  ],
);

/**
 * User feedback table for tracking satisfaction ratings.
 */
export const userFeedback = createMetricsTable(
  "user_feedback",
  (d) => ({
    id: d
      .uuid()
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    calculationId: d.uuid("calculation_id").notNull(),
    userId: d.uuid("user_id"), // Optional - may be null for anonymous feedback
    rating: d.numeric("rating", { precision: 1, scale: 0 }).notNull(), // 1-5 rating
    feedbackText: d.text("feedback_text"), // Optional feedback text
  }),
  (t) => [
    index("user_feedback_calculation_id_idx").on(t.calculationId),
    index("user_feedback_user_id_idx").on(t.userId),
    index("user_feedback_created_at_idx").on(t.createdAt),
    index("user_feedback_rating_idx").on(t.rating),
  ],
);

