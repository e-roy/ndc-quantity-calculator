import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * Table creator for calculator tables.
 */
export const createCalculatorTable = pgTableCreator((name) => name);

export const calculations = createCalculatorTable(
  "calculation",
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
    status: d
      .text()
      .$type<"pending" | "ready" | "error">()
      .notNull()
      .default("pending"),
    inputJson: d.jsonb("input_json"),
    normalizedJson: d.jsonb("normalized_json"),
    ndcCandidatesJson: d.jsonb("ndc_candidates_json"),
    selectedNdcJson: d.jsonb("selected_ndc_json"),
    quantityValue: d.numeric("quantity_value"),
    quantityUnit: d.text("quantity_unit"),
    warningsJson: d.jsonb("warnings_json"),
    aiNotes: d.text("ai_notes"),
    userId: d.uuid("user_id"),
  }),
  (t) => [
    index("calculation_status_idx").on(t.status),
    index("calculation_user_id_idx").on(t.userId),
    index("calculation_created_at_idx").on(t.createdAt),
  ],
);
