"use client";

import { useState } from "react";
import Link from "next/link";
import { EntryRow, type EntryRowData } from "@/components/diary/EntryRow";
import type { MealType } from "@/generated/prisma/client";

type MealCardProps = {
  meal: MealType;
  label: string;
  dateKey: string;
  entries: EntryRowData[];
};

export function MealCard({ meal, label, dateKey, entries }: MealCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl bg-surface">
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center rounded-xl px-3 py-2 text-left transition hover:bg-surface-hover"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="font-medium">
            {label}
            {entries.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-text-muted">
                ({entries.length})
              </span>
            ) : null}
          </span>
        </button>
        <Link
          href={`/diary/${dateKey}?add=${meal}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-accent-teal transition hover:bg-surface-hover"
          aria-label={`Add food to ${label}`}
          onClick={(e) => e.stopPropagation()}
        >
          +
        </Link>
      </div>

      {open ? (
        entries.length === 0 ? (
          <p className="border-t border-border px-4 py-3 text-sm text-text-muted">
            No foods logged
          </p>
        ) : (
          <div>
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} dateKey={dateKey} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
