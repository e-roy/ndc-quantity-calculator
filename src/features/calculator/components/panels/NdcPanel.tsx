"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Package } from "lucide-react";
import type { NdcCandidate } from "../../types";

type NdcPanelProps = {
  selectedNdc: NdcCandidate | null;
  ndcCandidates: NdcCandidate[] | null;
};

/**
 * NDC panel component that displays selected/recommended NDC and candidate list.
 */
export function NdcPanel({ selectedNdc, ndcCandidates }: NdcPanelProps) {
  const hasSelectedNdc = selectedNdc !== null;
  const hasCandidates = ndcCandidates && ndcCandidates.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>NDC Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected/Recommended NDC */}
        {hasSelectedNdc ? (
          <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <Package className="size-5" />
              <h3 className="text-lg font-semibold">Selected NDC</h3>
              {selectedNdc.matchScore !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Score: {selectedNdc.matchScore.toFixed(2)}
                </Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">NDC Code</p>
                <p className="font-mono text-sm font-medium">{selectedNdc.ndc}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Status</p>
                {selectedNdc.active ? (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Product Name</p>
                <p className="text-sm">{selectedNdc.productName}</p>
              </div>
              {selectedNdc.labelerName && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Labeler
                  </p>
                  <p className="text-sm">{selectedNdc.labelerName}</p>
                </div>
              )}
              {selectedNdc.strength && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Strength</p>
                  <Badge variant="outline" className="text-xs">
                    {selectedNdc.strength}
                  </Badge>
                </div>
              )}
              {selectedNdc.unit && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Unit</p>
                  <Badge variant="outline" className="text-xs">
                    {selectedNdc.unit}
                  </Badge>
                </div>
              )}
              {selectedNdc.packageDescription && (
                <div className="col-span-full space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Package Description
                  </p>
                  <p className="text-sm">{selectedNdc.packageDescription}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Alert variant="default">
            <Info className="size-4" />
            <AlertDescription>
              No NDC has been selected for this calculation.
            </AlertDescription>
          </Alert>
        )}

        {/* NDC Candidates List */}
        {hasCandidates && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold">
              NDC Candidates ({ndcCandidates.length})
            </h3>
            <div className="space-y-3">
              {ndcCandidates.map((candidate) => (
                <div
                  key={candidate.ndc}
                  className={`space-y-2 rounded-lg border p-4 ${
                    candidate.ndc === selectedNdc?.ndc
                      ? "bg-primary/5 border-primary"
                      : "bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {candidate.ndc}
                        </p>
                        {!candidate.active && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {candidate.matchScore !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {candidate.matchScore.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{candidate.productName}</p>
                      {candidate.labelerName && (
                        <p className="text-muted-foreground text-xs">
                          {candidate.labelerName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidate.strength && (
                      <Badge variant="outline" className="text-xs">
                        {candidate.strength}
                      </Badge>
                    )}
                    {candidate.unit && (
                      <Badge variant="outline" className="text-xs">
                        {candidate.unit}
                      </Badge>
                    )}
                    {candidate.packageDescription && (
                      <span className="text-muted-foreground text-xs">
                        {candidate.packageDescription}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasSelectedNdc && !hasCandidates && (
          <Alert variant="default">
            <Info className="size-4" />
            <AlertDescription>
              No NDC information is available for this calculation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

