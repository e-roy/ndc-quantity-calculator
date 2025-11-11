import { notFound } from "next/navigation";
import { getCalculationById } from "@/features/calculator/server/loaders";
import { SummaryPanel } from "@/features/calculator/components/panels/SummaryPanel";
import { CalculatorInputSchema } from "@/features/calculator/server/schema";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Extract original SIG and drugOrNdc from inputJson
  const input = calculation.inputJson
    ? CalculatorInputSchema.safeParse(calculation.inputJson)
    : null;
  const originalSig = input?.success ? input.data.sig : undefined;
  const drugOrNdc = input?.success ? input.data.drugOrNdc : undefined;

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

        {/* Main content sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary panel */}
          <SummaryPanel
            normalizedSig={calculation.normalizedJson}
            originalSig={originalSig}
            drugOrNdc={drugOrNdc}
          />

          {/* NDC section skeleton (placeholder for future phases) */}
          <div className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* Quantity section skeleton (placeholder for future phases) */}
          <div className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-36" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          {/* Warnings section skeleton (placeholder for future phases) */}
          <div className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-28" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
