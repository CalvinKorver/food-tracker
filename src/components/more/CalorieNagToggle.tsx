"use client";

import { useState, useTransition } from "react";
import { saveCalorieNagAction } from "@/app/more/actions";

type CalorieNagToggleProps = {
  enabled: boolean;
};

export function CalorieNagToggle({ enabled }: CalorieNagToggleProps) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        await saveCalorieNagAction(next);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Petty calorie coach"
      disabled={pending}
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left transition hover:bg-surface-hover disabled:opacity-60"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[17px] text-text">Petty calorie coach</span>
        <span className="text-sm text-text-muted">
          Nag you (comically) before logging over your calorie goal
        </span>
      </span>
      <span
        aria-hidden
        className="relative ml-3 h-7 w-12 shrink-0 rounded-full transition"
        style={{
          background: on ? "var(--accent)" : "var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition"
          style={{
            transform: on ? "translateX(1.25rem)" : "translateX(0)",
          }}
        />
      </span>
    </button>
  );
}
