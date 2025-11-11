"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import type { NormalizedSig, NdcCandidate, Warning } from "../../types";
import { parsePackageSize, calculateMultiPack, type MultiPackResult } from "../../utils/quantityMath";

type QuantityPanelProps = {
  quantityValue: string | null;
  quantityUnit: string | null;
  normalizedSig: NormalizedSig | null;
  daysSupply: number | undefined;
  selectedNdc: NdcCandidate | null;
  warnings: Warning[] | null;
};

/**
 * Quantity panel component that displays calculated quantity, math breakdown,
 * and overfill/underfill warnings.
 */
export function QuantityPanel({
  quantityValue,
  quantityUnit,
  normalizedSig,
  daysSupply,
  selectedNdc,
  warnings,
}: QuantityPanelProps) {
  // Check for overfill/underfill warnings
  const overfillWarning = warnings?.find((w) => w.type === "overfill");
  const underfillWarning = warnings?.find((w) => w.type === "underfill");

  // Parse package size if available
  const packageSize = selectedNdc
    ? parsePackageSize(selectedNdc.packageDescription)
    : null;

  // Calculate multi-pack information
  const multiPack: MultiPackResult = quantityValue && quantityUnit && packageSize
    ? calculateMultiPack(
        Number.parseFloat(quantityValue),
        quantityUnit,
        packageSize,
      )
    : null;

  // Check if calculation is complete
  const hasQuantity = quantityValue !== null && quantityUnit !== null;
  const hasCompleteData =
    normalizedSig?.dose !== undefined &&
    normalizedSig?.doseUnit !== undefined &&
    normalizedSig?.frequencyPerDay !== undefined &&
    daysSupply !== undefined;

  // Format quantity value for display
  const displayQuantity = quantityValue
    ? Number.parseFloat(quantityValue).toFixed(1).replace(/\.0$/, "")
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quantity</CardTitle>
          {(overfillWarning !== undefined || underfillWarning !== undefined) && (
            <Badge
              variant={overfillWarning ? "destructive" : "secondary"}
              className="text-xs"
            >
              {overfillWarning ? "Overfill" : "Underfill"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calculated quantity display */}
        {hasQuantity && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">
              Calculated Quantity
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{displayQuantity}</span>
              {quantityUnit && (
                <Badge variant="outline" className="text-sm">
                  {quantityUnit}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Math breakdown */}
        {hasCompleteData && hasQuantity && (
          <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
            <p className="text-muted-foreground text-xs font-medium">
              Calculation
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{normalizedSig.dose}</span>
              {normalizedSig.doseUnit && (
                <Badge variant="outline" className="text-xs">
                  {normalizedSig.doseUnit}
                </Badge>
              )}
              <span className="text-muted-foreground">×</span>
              <span className="font-medium">
                {normalizedSig.frequencyPerDay}
              </span>
              <span className="text-muted-foreground text-xs">
                {normalizedSig.frequencyPerDay === 1
                  ? "time/day"
                  : "times/day"}
              </span>
              <span className="text-muted-foreground">×</span>
              <span className="font-medium">{daysSupply}</span>
              <span className="text-muted-foreground text-xs">days</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-bold">{displayQuantity}</span>
              {quantityUnit && (
                <Badge variant="outline" className="text-xs">
                  {quantityUnit}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Package size comparison */}
        {packageSize && hasQuantity && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs font-medium">
              Package Size
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {packageSize.packageSize}
              </span>
              <Badge variant="outline" className="text-xs">
                {packageSize.packageUnit}
              </Badge>
              {selectedNdc?.packageDescription && (
                <span className="text-muted-foreground text-xs">
                  ({selectedNdc.packageDescription})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Multi-pack information */}
        {multiPack && multiPack.packageCount > 0 && (
          <div className="space-y-2 rounded-lg border bg-primary/5 p-4">
            <p className="text-muted-foreground text-xs font-medium">
              Packages Required
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">
                {multiPack.packageCount}
              </span>
              <span className="text-sm text-muted-foreground">
                package{multiPack.packageCount > 1 ? "s" : ""}
              </span>
              {multiPack.remainder > 0 && (
                <>
                  <span className="text-muted-foreground">+</span>
                  <span className="text-sm font-medium">
                    {multiPack.remainder.toFixed(1).replace(/\.0$/, "")}
                  </span>
                  {quantityUnit && (
                    <Badge variant="outline" className="text-xs">
                      {quantityUnit}
                    </Badge>
                  )}
                </>
              )}
            </div>
            {multiPack.packageCount > 1 && (
              <p className="text-muted-foreground text-xs">
                Total: {displayQuantity} {quantityUnit}
              </p>
            )}
          </div>
        )}

        {/* Overfill warning */}
        {overfillWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Overfill Detected</AlertTitle>
            <AlertDescription>{overfillWarning.message}</AlertDescription>
          </Alert>
        )}

        {/* Underfill warning */}
        {underfillWarning && (
          <Alert variant="default">
            <AlertTriangle className="size-4" />
            <AlertTitle>Underfill Detected</AlertTitle>
            <AlertDescription>{underfillWarning.message}</AlertDescription>
          </Alert>
        )}

        {/* Incomplete calculation warning */}
        {!hasQuantity && hasCompleteData && (
          <Alert variant="default">
            <AlertTriangle className="size-4" />
            <AlertTitle>Calculation Incomplete</AlertTitle>
            <AlertDescription>
              Unable to calculate quantity. Please verify that all required
              fields are present.
            </AlertDescription>
          </Alert>
        )}

        {/* Missing data warning */}
        {!hasCompleteData && (
          <Alert variant="default">
            <AlertTriangle className="size-4" />
            <AlertTitle>Insufficient Data</AlertTitle>
            <AlertDescription>
              Cannot calculate quantity. Missing dose, dose unit, frequency, or
              days supply information.
            </AlertDescription>
          </Alert>
        )}

        {/* Rounding note */}
        {hasQuantity && displayQuantity && (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
            <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">
                Note
              </p>
              <p className="text-muted-foreground text-xs">
                Quantity is calculated deterministically from SIG and days supply.
                No rounding is applied. For fractional results, consider adjusting
                days supply or package selection.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

