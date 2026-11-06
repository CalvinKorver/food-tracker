"use client";

import { useTransition } from "react";
import { deleteEntryAction } from "@/app/diary/actions";
import { SwipeToDeleteRow } from "@/components/ui/SwipeToDeleteRow";
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

  const remove = async () => {
    const result = await deleteEntryAction(entry.id, dateKey);
    if (!result.ok) {
      throw new Error(result.error);
    }
  };

  return (
    <SwipeToDeleteRow
      className="border-t border-border"
      onDelete={remove}
      disabled={pending}
    >
      <div className="flex items-start gap-3 bg-surface px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium leading-tight text-text">
            {entry.foodNameSnapshot}
          </div>
          <div className="text-sm leading-tight text-text-muted">
            {servingLabel}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tabular-nums text-sm font-medium">
            {formatNutrient(entry.caloriesSnapshot)} kcal
          </div>
          <button
            type="button"
            disabled={pending}
            className="mt-1 hidden text-xs text-danger disabled:opacity-50 [@media(pointer:fine)]:inline"
            onClick={() => {
              startTransition(async () => {
                await remove();
              });
            }}
          >
            {pending ? "Removing…" : "Delete"}
          </button>
        </div>
      </div>
    </SwipeToDeleteRow>
  );
}
