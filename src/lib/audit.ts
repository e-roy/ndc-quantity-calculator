/**
 * Audit logging service for HIPAA compliance and security tracking.
 * Records access, modification, authentication, and error events.
 */

import { db } from "@/lib/db";
import { auditLogs } from "@/server/db/compliance/schema";
import { NextRequest } from "next/server";

export type ActionType = "access" | "modify" | "authenticate" | "export" | "error";
export type ResourceType = "calculation" | "user" | "export" | "session";

/**
 * Extracts IP address and user agent from a Next.js request.
 *
 * @param request - Next.js request object (optional)
 * @returns Object with ipAddress and userAgent
 */
export function extractRequestInfo(
  request?: NextRequest | Request | { headers?: Headers },
): { ipAddress: string | null; userAgent: string | null } {
  let headers: Headers | undefined;

  // Check if request has headers property (works for Request, NextRequest, or plain objects)
  if (request && "headers" in request && request.headers instanceof Headers) {
    headers = request.headers;
  }

  // Extract IP address (check various headers for proxy/load balancer scenarios)
  let ipAddress: string | null = null;
  if (headers) {
    ipAddress =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      headers.get("cf-connecting-ip") ??
      null;
  }

  // Extract user agent
  const userAgent = headers?.get("user-agent") ?? null;

  return { ipAddress, userAgent };
}

/**
 * Logs a data access event (viewing calculations, reading data).
 *
 * @param resourceType - Type of resource being accessed
 * @param resourceId - ID of the resource
 * @param userId - Optional user ID
 * @param metadata - Optional additional context
 * @param request - Optional request object for IP/user agent extraction
 */
export async function logAccess(
  resourceType: ResourceType,
  resourceId: string,
  userId?: string | null,
  metadata?: Record<string, unknown>,
  request?: NextRequest | Request | { headers?: Headers },
): Promise<void> {
  try {
    const { ipAddress, userAgent } = extractRequestInfo(request);

    await db.insert(auditLogs).values({
      userId: userId ?? null,
      actionType: "access",
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      metadata: metadata ?? null,
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the app
    console.error("[Audit] Failed to log access:", error);
  }
}

/**
 * Logs a data modification event (creating, updating calculations).
 *
 * @param resourceType - Type of resource being modified
 * @param resourceId - ID of the resource
 * @param userId - Optional user ID
 * @param metadata - Optional additional context
 * @param request - Optional request object for IP/user agent extraction
 */
export async function logModification(
  resourceType: ResourceType,
  resourceId: string,
  userId?: string | null,
  metadata?: Record<string, unknown>,
  request?: NextRequest | Request | { headers?: Headers },
): Promise<void> {
  try {
    const { ipAddress, userAgent } = extractRequestInfo(request);

    await db.insert(auditLogs).values({
      userId: userId ?? null,
      actionType: "modify",
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      metadata: metadata ?? null,
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the app
    console.error("[Audit] Failed to log modification:", error);
  }
}

/**
 * Logs an authentication event (login, logout, failed login).
 *
 * @param action - Authentication action ("login", "logout", "login_failed")
 * @param userId - Optional user ID (null for failed logins)
 * @param metadata - Optional additional context (error messages, etc.)
 * @param request - Optional request object for IP/user agent extraction
 */
export async function logAuthentication(
  action: "login" | "logout" | "login_failed",
  userId?: string | null,
  metadata?: Record<string, unknown>,
  request?: NextRequest | Request | { headers?: Headers },
): Promise<void> {
  try {
    const { ipAddress, userAgent } = extractRequestInfo(request);

    await db.insert(auditLogs).values({
      userId: userId ?? null,
      actionType: "authenticate",
      resourceType: "session",
      resourceId: null, // Sessions don't have a resource ID
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        authAction: action,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the app
    console.error("[Audit] Failed to log authentication:", error);
  }
}

/**
 * Logs a security-relevant error event.
 *
 * @param resourceType - Type of resource involved
 * @param resourceId - Optional ID of the resource
 * @param userId - Optional user ID
 * @param error - Error message or details
 * @param metadata - Optional additional context
 * @param request - Optional request object for IP/user agent extraction
 */
export async function logError(
  resourceType: ResourceType,
  error: string | Error,
  resourceId?: string | null,
  userId?: string | null,
  metadata?: Record<string, unknown>,
  request?: NextRequest | Request | { headers?: Headers },
): Promise<void> {
  try {
    const { ipAddress, userAgent } = extractRequestInfo(request);

    const errorMessage = error instanceof Error ? error.message : error;

    await db.insert(auditLogs).values({
      userId: userId ?? null,
      actionType: "error",
      resourceType,
      resourceId: resourceId ?? null,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    });
  } catch (auditError) {
    // Log but don't throw - audit logging should not break the app
    console.error("[Audit] Failed to log error:", auditError);
  }
}

/**
 * Logs an export event (JSON/CSV downloads).
 *
 * @param resourceType - Type of resource being exported
 * @param resourceId - ID of the resource
 * @param format - Export format ("json" | "csv")
 * @param userId - Optional user ID
 * @param request - Optional request object for IP/user agent extraction
 */
export async function logExport(
  resourceType: ResourceType,
  resourceId: string,
  format: "json" | "csv",
  userId?: string | null,
  request?: NextRequest | Request | { headers?: Headers },
): Promise<void> {
  try {
    const { ipAddress, userAgent } = extractRequestInfo(request);

    await db.insert(auditLogs).values({
      userId: userId ?? null,
      actionType: "export",
      resourceType: "export",
      resourceId,
      ipAddress,
      userAgent,
      metadata: {
        exportedResourceType: resourceType,
        exportedResourceId: resourceId,
        format,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the app
    console.error("[Audit] Failed to log export:", error);
  }
}

