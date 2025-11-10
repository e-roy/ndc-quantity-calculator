type Props = {
  params: Promise<{ id: string }>;
};

export default async function HistoryDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          History Entry: {id}
        </h1>
        <p className="text-muted-foreground">
          This is a placeholder for the history detail page.
        </p>
      </div>
    </div>
  );
}

