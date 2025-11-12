/**
 * Main schema file that re-exports all table definitions.
 * Tables are organized by feature in their own schema files.
 */

// Re-export auth tables from auth schema
export {
  accounts,
  accountsRelations,
  sessions,
  sessionsRelations,
  users,
  usersRelations,
  verificationTokens,
} from "./auth/schema";

// Re-export calculator tables from calculator schema
export { calculations } from "./calculator/schema";

// Re-export metrics tables from metrics schema
export {
  performanceMetrics,
  calculationMetrics,
  userFeedback,
} from "./metrics/schema";

// Re-export compliance tables from compliance schema
export { auditLogs } from "./compliance/schema";
