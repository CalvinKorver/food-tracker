export default function FoodsPage() {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <h1 className="text-lg font-semibold tracking-tight">Foods</h1>
      <p className="text-sm text-text-muted">
        Your custom foods will live here. Coming in a later Phase 1 step.
      </p>
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-10 text-center text-sm text-text-muted">
        No foods yet
      </div>
    </div>
  );
}
