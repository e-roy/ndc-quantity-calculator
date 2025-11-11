"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTabParam } from "../hooks/useTabParam";
import { SummaryPanel } from "./panels/SummaryPanel";
import { NdcPanel } from "./panels/NdcPanel";
import { QuantityPanel } from "./panels/QuantityPanel";
import { WarningsPanel } from "./panels/WarningsPanel";
import { JsonPanel } from "./panels/JsonPanel";
import type {
  SerializedCalculation,
  NdcCandidate,
  NormalizedSig,
  Warning,
} from "../types";

type ResultsTabsProps = {
  calculation: SerializedCalculation;
  originalSig?: string;
  drugOrNdc?: string;
  daysSupply?: number;
  selectedNdc: NdcCandidate | null;
  ndcCandidates: NdcCandidate[] | null;
  warnings: Warning[] | null;
  normalizedSig: NormalizedSig | null;
};

/**
 * Results tabs component that displays calculation results in a tabbed interface.
 * Supports deep linking via ?tab= query parameter.
 */
export function ResultsTabs({
  calculation,
  originalSig,
  drugOrNdc,
  daysSupply,
  selectedNdc,
  ndcCandidates,
  warnings,
  normalizedSig,
}: ResultsTabsProps) {
  const [activeTab, setTab] = useTabParam();

  const warningCount = warnings?.length ?? 0;

  return (
    <Tabs value={activeTab} onValueChange={(value) => setTab(value as typeof activeTab)}>
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="ndc">NDC</TabsTrigger>
        <TabsTrigger value="quantity">Quantity</TabsTrigger>
        <TabsTrigger value="warnings" className="relative">
          Warnings
          {warningCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 size-5 rounded-full p-0 text-xs"
            >
              {warningCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-6">
        <SummaryPanel
          calculationId={calculation.id}
          normalizedSig={normalizedSig}
          originalSig={originalSig}
          drugOrNdc={drugOrNdc}
          selectedNdc={selectedNdc}
          aiNotes={calculation.aiNotes}
          ndcCandidates={ndcCandidates}
        />
      </TabsContent>

      <TabsContent value="ndc" className="mt-6">
        <NdcPanel
          selectedNdc={selectedNdc}
          ndcCandidates={ndcCandidates}
        />
      </TabsContent>

      <TabsContent value="quantity" className="mt-6">
        <QuantityPanel
          quantityValue={calculation.quantityValue}
          quantityUnit={calculation.quantityUnit}
          normalizedSig={normalizedSig}
          daysSupply={daysSupply}
          selectedNdc={selectedNdc}
          warnings={warnings}
        />
      </TabsContent>

      <TabsContent value="warnings" className="mt-6">
        <WarningsPanel warnings={warnings} />
      </TabsContent>

      <TabsContent value="json" className="mt-6">
        <JsonPanel calculation={calculation} />
      </TabsContent>
    </Tabs>
  );
}

