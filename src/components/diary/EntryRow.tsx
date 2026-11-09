"use client";

import { deleteEntryAction } from "@/app/diary/actions";
import { SwipeToDeleteRow } from "@/components/ui/SwipeToDeleteRow";
import { formatQuantityLabel } from "@/lib/quantity";

export type EntryRowData = {
  id: string;
  foodNameSnapshot: string;
  quantityValue: number;
  quantityUnit: string;
  caloriesSnapshot: number;
};

type EntryRowProps = {
  entry: EntryRowData;
  dateKey: string;
};

export function EntryRow({ entry, dateKey }: EntryRowProps) {
  const servingLabel = formatQuantityLabel(
    entry.quantityValue,
    entry.quantityUnit,
  );

  return (
    <SwipeToDeleteRow
      onDelete={async () => {
        const result = await deleteEntryAction(entry.id, dateKey);
        if (!result.ok) {
          throw new Error(result.error);
        }
      }}
    >
      <div className="flex items-start gap-3 bg-surface px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-snug text-text">
            {entry.foodNameSnapshot}
          </div>
          <div className="text-[13px] leading-snug text-text-muted">
            {servingLabel}
          </div>
        </div>
        <div className="shrink-0 text-right text-[15px] leading-snug tabular-nums text-text">
          {Math.ceil(entry.caloriesSnapshot)} cal
        </div>
      </div>
    </SwipeToDeleteRow>
  );
}
