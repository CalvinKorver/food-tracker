import { EntryRow, type EntryRowData } from "@/components/diary/EntryRow";

type MealCardProps = {
  label: string;
  dateKey: string;
  entries: EntryRowData[];
};

export function MealCard({ label, dateKey, entries }: MealCardProps) {
  return (
    <section>
      <h2 className="px-4 pb-2 text-[13px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl bg-surface">
        {entries.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-text-muted">No foods logged</p>
        ) : (
          entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} dateKey={dateKey} />
          ))
        )}
      </div>
    </section>
  );
}
