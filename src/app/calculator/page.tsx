import { Suspense } from "react";
import { InputForm } from "@/features/calculator/components/InputForm";

function InputFormFallback() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="animate-pulse space-y-4 rounded-lg border bg-muted/50 p-8">
        <div className="h-8 w-48 bg-muted" />
        <div className="h-4 w-64 bg-muted" />
        <div className="space-y-4 pt-4">
          <div className="h-10 w-full bg-muted" />
          <div className="h-20 w-full bg-muted" />
          <div className="h-10 w-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<InputFormFallback />}>
      <InputForm />
    </Suspense>
  );
}
