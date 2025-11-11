"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Info } from "lucide-react";
import type { NormalizedSig, NdcCandidate } from "../../types";
import { isSigComplete } from "../../utils/sigParser";

type SummaryPanelProps = {
  normalizedSig: NormalizedSig | null;
  originalSig?: string;
  drugOrNdc?: string;
  selectedNdc?: NdcCandidate | null;
};

/**
 * Summary panel component that displays parsed SIG values.
 * Shows gentle warnings if the parse is partial.
 */
export function SummaryPanel({
  normalizedSig,
  originalSig,
  drugOrNdc,
  selectedNdc,
}: SummaryPanelProps) {
  const isComplete = normalizedSig ? isSigComplete(normalizedSig) : false;
  const hasPartialData = normalizedSig && !isComplete;
  const medicationName =
    normalizedSig?.name ?? drugOrNdc ?? "Unknown medication";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Medication name display */}
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-medium">
            Medication
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{medicationName}</p>
            {normalizedSig?.rxcui && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground size-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Source: RxNorm</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Original SIG display */}
        {originalSig && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">
              Original SIG
            </p>
            <p className="text-sm">{originalSig}</p>
          </div>
        )}

        {/* Selected NDC */}
        {selectedNdc && (
          <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
            <p className="text-muted-foreground text-sm font-medium">
              Selected NDC
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-medium">{selectedNdc.ndc}</p>
                {selectedNdc.active ? (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Inactive
                  </Badge>
                )}
                {selectedNdc.matchScore !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    Confidence: {(selectedNdc.matchScore * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-sm">{selectedNdc.productName}</p>
            </div>
          </div>
        )}

        {/* Parsed values */}
        {normalizedSig && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm font-medium">
              Parsed Values
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Dose */}
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Dose</p>
                {normalizedSig.dose !== undefined ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {normalizedSig.dose}
                    </span>
                    {normalizedSig.doseUnit && (
                      <Badge variant="outline" className="text-xs">
                        {normalizedSig.doseUnit}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Not parsed
                  </p>
                )}
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  Frequency Per Day
                </p>
                {normalizedSig.frequencyPerDay !== undefined ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {normalizedSig.frequencyPerDay}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {normalizedSig.frequencyPerDay === 1
                        ? "time per day"
                        : "times per day"}
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Not parsed
                  </p>
                )}
              </div>

              {/* Route */}
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Route</p>
                {normalizedSig.route ? (
                  <Badge variant="secondary" className="text-xs">
                    {normalizedSig.route}
                  </Badge>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Not parsed
                  </p>
                )}
              </div>

              {/* RxCUI */}
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">RxCUI</p>
                {normalizedSig.rxcui ? (
                  <Badge variant="outline" className="font-mono text-xs">
                    {normalizedSig.rxcui}
                  </Badge>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Not available
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning for partial parse */}
        {hasPartialData && (
          <Alert variant="default">
            <AlertTriangle className="size-4" />
            <AlertTitle>Partial Parse</AlertTitle>
            <AlertDescription>
              Some information could not be parsed from the SIG. The calculation
              may be incomplete. Please verify the prescription instructions.
            </AlertDescription>
          </Alert>
        )}

        {/* No data message */}
        {!normalizedSig && (
          <Alert variant="default">
            <AlertTriangle className="size-4" />
            <AlertTitle>No Parsed Data</AlertTitle>
            <AlertDescription>
              No parsed SIG data is available for this calculation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
