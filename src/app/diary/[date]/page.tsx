type DiaryPageProps = {
  params: Promise<{ date: string }>;
};

export default async function DiaryPage({ params }: DiaryPageProps) {
  const { date } = await params;
  const label = date === "today" ? "Today" : date;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-1">
        <span className="w-8" aria-hidden />
        <div className="flex items-center gap-3">
          <span className="text-text-muted" aria-hidden>
            ‹
          </span>
          <h1 className="text-lg font-semibold tracking-tight">{label}</h1>
          <span className="text-text-muted" aria-hidden>
            ›
          </span>
        </div>
        <span className="w-8" aria-hidden />
      </header>

      <section className="rounded-2xl bg-surface p-4">
        <div className="mb-3 text-xs font-semibold tracking-[0.12em] text-text-muted">
          TODAY&apos;S TOTALS
        </div>
        <ul className="space-y-3 text-sm">
          {[
            ["Energy", "0 kcal"],
            ["Protein", "0 g"],
            ["Net Carbs", "0 g"],
            ["Fat", "0 g"],
            ["Sodium", "0 mg"],
          ].map(([name, value]) => (
            <li key={name} className="flex items-center justify-between">
              <span className="text-text-muted">{name}</span>
              <span className="font-medium tabular-nums">{value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        {["Breakfast", "Lunch", "Dinner", "Snacks"].map((meal) => (
          <div
            key={meal}
            className="flex items-center justify-between rounded-2xl bg-surface px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-lg font-semibold text-accent-teal"
                aria-hidden
              >
                +
              </span>
              <span className="font-medium">{meal}</span>
            </div>
            <span className="text-text-muted" aria-hidden>
              ⌄
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
