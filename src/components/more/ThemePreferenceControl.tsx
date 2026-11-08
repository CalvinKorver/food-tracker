"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemePreferenceControl() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className="flex rounded-xl bg-surface p-1"
      role="group"
      aria-label="Appearance"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
            style={{
              background: active ? "var(--bg-elevated)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              boxShadow: active ? "0 0 0 1px var(--border)" : undefined,
            }}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
