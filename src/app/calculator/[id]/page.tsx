import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CalculatorResultPage({ params }: Props) {
  await params; // id will be used in Phase 5 when loading calculation data
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Main content sections skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary section skeleton */}
          <div className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>

          {/* NDC section skeleton */}
          <div className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* Quantity section skeleton */}
          <div className="space-y-4 rounded-lg border p-6">
            <Skeleton className="h-6 w-36" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          {/* Warnings section skeleton */}
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
