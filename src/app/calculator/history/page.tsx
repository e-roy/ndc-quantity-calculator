import { getHistory } from "@/features/calculator/server/loaders";
import { HistoryList } from "@/features/calculator/components/HistoryList";

type Props = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: Props) {
  const params = await searchParams;

  // Parse pagination params
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : 20;

  // Parse date filters
  const fromDate = params.fromDate
    ? (isNaN(Date.parse(params.fromDate))
        ? undefined
        : new Date(params.fromDate))
    : undefined;
  const toDate = params.toDate
    ? (isNaN(Date.parse(params.toDate)) ? undefined : new Date(params.toDate))
    : undefined;

  // Fetch history
  const result = await getHistory({
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 20 : pageSize,
    search: params.search,
    fromDate,
    toDate,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Calculation History</h1>
          <p className="text-muted-foreground">
            View and search through your past calculations
          </p>
        </div>

        {/* History list */}
        <HistoryList result={result} />
      </div>
    </div>
  );
}
