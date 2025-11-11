import { notFound } from "next/navigation";
import { getCalculationById } from "@/features/calculator/server/loaders";
import { ResultsTabs } from "@/features/calculator/components/ResultsTabs";
import { CalculatorInputSchema } from "@/features/calculator/server/schema";
import type {
  NdcCandidate,
  Warning,
  SerializedCalculation,
} from "@/features/calculator/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CalculatorResultPage({ params }: Props) {
  const { id } = await params;

  // Load calculation data (will compute normalizedJson if empty)
  const calculation = await getCalculationById(id);

  if (!calculation) {
    notFound();
  }

  // Extract original SIG, drugOrNdc, and daysSupply from inputJson
  const input = calculation.inputJson
    ? CalculatorInputSchema.safeParse(calculation.inputJson)
    : null;
  const originalSig = input?.success ? input.data.sig : undefined;
  const drugOrNdc = input?.success ? input.data.drugOrNdc : undefined;
  const daysSupply = input?.success ? input.data.daysSupply : undefined;

  // Extract selected NDC, candidates, and warnings
  const selectedNdc = calculation.selectedNdcJson;
  const ndcCandidates = calculation.ndcCandidatesJson;
  const warnings = calculation.warningsJson;

  // Serialize calculation for client component (convert Date to ISO string)
  const serializedCalculation: SerializedCalculation = {
    ...calculation,
    createdAt: calculation.createdAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Calculation Results</h1>
          <p className="text-muted-foreground">
            Calculation ID: {calculation.id}
          </p>
        </div>

        {/* Results tabs */}
        <ResultsTabs
          calculation={serializedCalculation}
          originalSig={originalSig}
          drugOrNdc={drugOrNdc}
          daysSupply={daysSupply}
          selectedNdc={selectedNdc}
          ndcCandidates={ndcCandidates}
          warnings={warnings}
          normalizedSig={calculation.normalizedJson}
        />
      </div>
    </div>
  );
}
