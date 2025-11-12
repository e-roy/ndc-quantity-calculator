"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Info, Download, Sparkles, XCircle } from "lucide-react";
import { exportCalculation } from "../../server/actions";
import type { NormalizedSig, NdcCandidate } from "../../types";
import { isSigComplete } from "../../utils/sigParser";
import { parsePackageSize, calculateMultiPack, type MultiPackResult } from "../../utils/quantityMath";
import { FeedbackForm } from "../FeedbackForm";

type SummaryPanelProps = {
  calculationId: string;
  normalizedSig: NormalizedSig | null;
  originalSig?: string;
  drugOrNdc?: string;
  daysSupply?: number;
  quantityValue?: string | null;
  quantityUnit?: string | null;
  selectedNdc?: NdcCandidate | null;
  aiNotes?: string | null;
  ndcCandidates?: NdcCandidate[] | null;
};

/**
 * Triggers a file download from a server action response.
 */
async function triggerDownload(
  response: Response,
  filename: string,
): Promise<void> {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Summary panel component that displays parsed SIG values.
 * Shows gentle warnings if the parse is partial.
 */
export function SummaryPanel({
  calculationId,
  normalizedSig,
  originalSig,
  drugOrNdc,
  daysSupply: _daysSupply,
  quantityValue,
  quantityUnit,
  selectedNdc,
  aiNotes,
  ndcCandidates,
}: SummaryPanelProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const isComplete = normalizedSig ? isSigComplete(normalizedSig) : false;
  const hasPartialData = normalizedSig && !isComplete;
  const medicationName =
    normalizedSig?.name ?? drugOrNdc ?? "Unknown medication";
  const hasAiSuggestion = !!aiNotes && !!selectedNdc;
  const hasAlternatives = ndcCandidates && ndcCandidates.length > 1;

  // Calculate multi-pack information
  const packageSize = selectedNdc
    ? parsePackageSize(selectedNdc.packageDescription)
    : null;
  const multiPack: MultiPackResult =
    quantityValue && quantityUnit && packageSize
      ? calculateMultiPack(
          Number.parseFloat(quantityValue),
          quantityUnit,
          packageSize,
        )
      : null;

  const handleViewAlternatives = () => {
    // Navigate to NDC tab by updating URL
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "ndc");
    router.push(url.pathname + url.search);
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const response = await exportCalculation(calculationId, "json");
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${calculationId}-calculation.json`;
      await triggerDownload(response, filename);
      toast.success("JSON exported successfully");
    } catch (error) {
      toast.error("Failed to export JSON");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const response = await exportCalculation(calculationId, "csv");
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${calculationId}-calculation.csv`;
      await triggerDownload(response, filename);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Summary</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="gap-2"
              disabled={isExporting}
            >
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-2"
              disabled={isExporting}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>
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

        {/* Suggested/Selected NDC */}
        {selectedNdc && (
          <div
            className={`space-y-2 rounded-lg border p-4 ${
              !selectedNdc.active
                ? "border-destructive bg-destructive/5"
                : "bg-muted/50"
            }`}
          >
            {!selectedNdc.active && (
              <Alert variant="destructive" className="mb-2">
                <XCircle className="size-4" />
                <AlertTitle className="font-bold">Inactive NDC Warning</AlertTitle>
                <AlertDescription>
                  This NDC is no longer active. Please select an active alternative from the NDC tab.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-medium">
                {hasAiSuggestion ? "Suggested NDC" : "Selected NDC"}
              </p>
              {hasAiSuggestion && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="size-3" />
                  AI-aided
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-medium">{selectedNdc.ndc}</p>
                {selectedNdc.active ? (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    <AlertTriangle className="mr-1 size-3" />
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
              {hasAiSuggestion && aiNotes && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Rationale
                  </p>
                  <p className="text-xs italic">{aiNotes}</p>
                </div>
              )}
              {hasAiSuggestion && hasAlternatives && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewAlternatives}
                  className="mt-2 w-full sm:w-auto"
                >
                  View alternatives ({ndcCandidates?.length ?? 0})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Multi-pack information */}
        {multiPack && multiPack.packageCount > 0 && (
          <div className="space-y-2 rounded-lg border bg-primary/5 p-4">
            <p className="text-muted-foreground text-sm font-medium">
              Packages Required
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold">
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
            {quantityValue && quantityUnit && (
              <p className="text-muted-foreground text-xs">
                Total quantity: {Number.parseFloat(quantityValue).toFixed(1).replace(/\.0$/, "")} {quantityUnit}
              </p>
            )}
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

    {/* Feedback Form */}
    <FeedbackForm calculationId={calculationId} />
  </>
  );
}
