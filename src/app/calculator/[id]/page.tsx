import { notFound } from "next/navigation";
import Link from "next/link";
import { getCalculationById } from "@/features/calculator/server/loaders";
import { ResultsTabs } from "@/features/calculator/components/ResultsTabs";
import { CalculatorInputSchema } from "@/features/calculator/server/schema";
import type { SerializedCalculation } from "@/features/calculator/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RotateCcw } from "lucide-react";

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
      {/* Navigation / Breadcrumbs */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/calculator">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Calculator
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Hero Result & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-primary/5 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-muted-foreground">
                Quantity to Dispense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">
                  {calculation.quantityValue ? Number.parseFloat(calculation.quantityValue).toFixed(0) : "--"}
                </span>
                <span className="text-xl font-medium text-muted-foreground">
                  {calculation.quantityUnit ?? "units"}
                </span>
              </div>
              
              {/* Primary Action: Recalculate */}
              <div className="mt-6">
                <Link 
                  href={`/calculator?drug=${encodeURIComponent(drugOrNdc ?? "")}&sig=${encodeURIComponent(originalSig ?? "")}&days=${daysSupply ?? ""}`}
                >
                  <Button className="w-full gap-2" variant="outline">
                    <RotateCcw className="size-4" />
                    Edit Inputs / Recalculate
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Input Summary (Context) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Drug / NDC</p>
                <p className="break-words">{drugOrNdc}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">SIG</p>
                <p className="italic">&quot;{originalSig}&quot;</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Days Supply</p>
                <p>{daysSupply} Days</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Detailed Tabs */}
        <div className="lg:col-span-2">
           <div className="space-y-6">
             {/* Header */}
             <div className="space-y-2">
               <h1 className="text-2xl font-bold">Calculation Details</h1>
               <p className="text-sm text-muted-foreground">
                 ID: {calculation.id}
               </p>
             </div>

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
      </div>
    </div>
  );
}
