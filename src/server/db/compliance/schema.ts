import { index, pgTableCreator, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

/**
 * Table creator for compliance tables.
 */
export const createComplianceTable = pgTableCreator((name) => name);

/**
 * Audit logs table for tracking access, modifications, and authentication events.
 * Required for HIPAA compliance and security auditing.
 */
export const auditLogs = createComplianceTable(
  "audit_log",
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
    userId: d.uuid("user_id"), // Optional - may be null for anonymous actions
    actionType: d.text("action_type").notNull(), // e.g., "access", "modify", "authenticate", "export"
    resourceType: d.text("resource_type").notNull(), // e.g., "calculation", "user", "export"
    resourceId: d.uuid("resource_id"), // ID of the resource being accessed/modified
    ipAddress: d.text("ip_address"), // IP address of the requester
    userAgent: d.text("user_agent"), // User agent string
    metadata: d.jsonb("metadata"), // Additional context (error details, request params, etc.)
  }),
  (t) => [
    index("audit_log_user_id_idx").on(t.userId),
    index("audit_log_timestamp_idx").on(t.createdAt),
    index("audit_log_resource_type_idx").on(t.resourceType),
    index("audit_log_action_type_idx").on(t.actionType),
    index("audit_log_resource_id_idx").on(t.resourceId),
  ],
);

