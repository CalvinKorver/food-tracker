"use client";

import { useTransition } from "react";
import { deleteEntryAction } from "@/app/diary/actions";
import { formatNutrient } from "@/lib/nutrients";
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
  const [pending, startTransition] = useTransition();

  const servingLabel = formatQuantityLabel(
    entry.quantityValue,
    entry.quantityUnit,
  );

  return (
    <div className="flex items-start gap-3 border-t border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-text">
          {entry.foodNameSnapshot}
        </div>
        <div className="mt-0.5 text-sm text-text-muted">{servingLabel}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="tabular-nums text-sm font-medium">
          {formatNutrient(entry.caloriesSnapshot)} kcal
        </div>
        <button
          type="button"
          disabled={pending}
          className="mt-1 text-xs text-danger disabled:opacity-50"
          onClick={() => {
            startTransition(async () => {
              await deleteEntryAction(entry.id, dateKey);
            });
          }}
        >
          {pending ? "Removing…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
