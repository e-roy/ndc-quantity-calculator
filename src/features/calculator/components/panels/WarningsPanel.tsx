"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { Warning } from "../../types";

type WarningsPanelProps = {
  warnings: Warning[] | null;
};

/**
 * Warnings panel component that displays all warnings grouped by severity.
 * Shows toast notification on mount if warnings exist.
 */
export function WarningsPanel({ warnings }: WarningsPanelProps) {
  const warningList = warnings ?? [];
  const hasWarnings = warningList.length > 0;

  // Show toast on first load if warnings exist
  useEffect(() => {
    if (hasWarnings) {
      const errorCount = warningList.filter((w) => w.severity === "error").length;
      const warningCount = warningList.filter((w) => w.severity === "warning").length;

      if (errorCount > 0) {
        toast.error(
          `${errorCount} error${errorCount > 1 ? "s" : ""} found in calculation`,
        );
      } else if (warningCount > 0) {
        toast.warning(
          `${warningCount} warning${warningCount > 1 ? "s" : ""} found in calculation`,
        );
      } else {
        toast.info(`${warningList.length} information notice${warningList.length > 1 ? "s" : ""}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally empty deps

  // Group warnings by severity
  const errors = warningList.filter((w) => w.severity === "error");
  const warningItems = warningList.filter((w) => w.severity === "warning");
  const infos = warningList.filter((w) => w.severity === "info");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warnings &amp; Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasWarnings ? (
          <Alert variant="default">
            <Info className="size-4" />
            <AlertTitle>No Warnings</AlertTitle>
            <AlertDescription>
              No warnings or alerts were generated for this calculation.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-destructive">
                  Errors ({errors.length})
                </h3>
                {errors.map((warning, index) => (
                  <Alert key={index} variant="destructive">
                    <XCircle className="size-4" />
                    <AlertTitle>
                      {warning.type.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                        l.toUpperCase(),
                      )}
                    </AlertTitle>
                    <AlertDescription>{warning.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Warnings */}
            {warningItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Warnings ({warningItems.length})</h3>
                {warningItems.map((warning, index) => (
                  <Alert key={index} variant="default">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>
                      {warning.type.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                        l.toUpperCase(),
                      )}
                    </AlertTitle>
                    <AlertDescription>{warning.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Info notices */}
            {infos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Information ({infos.length})</h3>
                {infos.map((warning, index) => (
                  <Alert key={index} variant="default">
                    <Info className="size-4" />
                    <AlertTitle>
                      {warning.type.replace(/_/g, " ").replace(/\b\w/g, (l) =>
                        l.toUpperCase(),
                      )}
                    </AlertTitle>
                    <AlertDescription>{warning.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

