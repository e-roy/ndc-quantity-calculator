import Link from "next/link";
import { Button } from "@/components/ui/button";

// Fake history data for placeholder
const fakeHistory = [
  { id: "1", date: "2024-01-15", medication: "Lisinopril 10mg" },
  { id: "2", date: "2024-01-14", medication: "Metformin 500mg" },
  { id: "3", date: "2024-01-13", medication: "Atorvastatin 20mg" },
];

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <div className="rounded-lg border">
          <div className="divide-y">
            {fakeHistory.map((item) => (
              <Link
                key={item.id}
                href={`/calculator/history/${item.id}`}
                className="block p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.medication}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <span>View</span>
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

