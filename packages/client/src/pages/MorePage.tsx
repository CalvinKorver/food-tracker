import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import type { ThemePreference } from "@food-tracker/domain";
import { useAuth } from "../auth";
import { useApi } from "../config";
import { useTheme } from "../theme/ThemeProvider";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function MorePage() {
  const { user, signOut, refreshUser } = useAuth();
  const api = useApi();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const nag = useMutation({
    mutationFn: (enabled: boolean) => api.setCalorieNag(enabled),
    onSuccess: () => void refreshUser(),
  });

  const reset = useMutation({
    mutationFn: () =>
      api.requestPasswordReset({ email: user?.email ?? "" }),
    onSuccess: (data) => setMessage(data.message),
    onError: (err: Error) => setError(err.message),
  });

  const exportData = useMutation({
    mutationFn: () => api.exportData(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "food-tracker-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const destroy = useMutation({
    mutationFn: () => api.deleteAccount(),
    onSuccess: async () => {
      await signOut();
      navigate("/sign-in", { replace: true });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6 pt-1">
      <h1 className="text-lg font-semibold tracking-tight">More</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold">Appearance</h2>
        <p className="text-sm text-text-muted">
          Follow system settings, or lock light or dark.
        </p>
        <div className="flex rounded-xl bg-surface p-1" role="group" aria-label="Appearance">
          {THEME_OPTIONS.map((option) => {
            const active = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreference(option.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium"
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
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-semibold">Settings</h2>
        <Link
          to="/more/goals"
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-[17px] hover:bg-surface-hover"
        >
          <span>Goals</span>
          <span className="text-text-muted" aria-hidden>
            ›
          </span>
        </Link>
        <Link
          to="/more/meal-times"
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-[17px] hover:bg-surface-hover"
        >
          <span>Meal times</span>
          <span className="text-text-muted" aria-hidden>
            ›
          </span>
        </Link>
        <button
          type="button"
          role="switch"
          aria-checked={user?.calorieNagEnabled ?? false}
          onClick={() => nag.mutate(!(user?.calorieNagEnabled ?? false))}
          className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left hover:bg-surface-hover"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[17px]">Petty calorie coach</span>
            <span className="text-sm text-text-muted">
              Nag you before logging over your calorie goal
            </span>
          </span>
          <span
            aria-hidden
            className="relative ml-3 h-7 w-12 shrink-0 rounded-full"
            style={{
              background: user?.calorieNagEnabled ? "var(--accent)" : "var(--border)",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition"
              style={{
                transform: user?.calorieNagEnabled
                  ? "translateX(1.25rem)"
                  : "translateX(0)",
              }}
            />
          </span>
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-semibold">Account</h2>
        <p className="text-sm text-text-muted">{user?.email}</p>
        <button
          type="button"
          onClick={() => exportData.mutate()}
          className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left text-[17px] hover:bg-surface-hover"
        >
          {exportData.isPending ? "Exporting…" : "Export data"}
        </button>
        <button
          type="button"
          disabled={!user?.email || reset.isPending}
          onClick={() => reset.mutate()}
          className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left text-[17px] hover:bg-surface-hover"
        >
          {reset.isPending ? "Sending…" : "Request password reset"}
        </button>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await signOut();
            navigate("/sign-in", { replace: true });
          }}
          className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left text-[17px] text-danger hover:bg-surface-hover"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        <button
          type="button"
          disabled={destroy.isPending}
          onClick={() => {
            if (
              confirm(
                "Delete your account and all food data? This cannot be undone.",
              )
            ) {
              destroy.mutate();
            }
          }}
          className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left text-[17px] text-danger hover:bg-surface-hover"
        >
          {destroy.isPending ? "Deleting…" : "Delete account"}
        </button>
      </section>

      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
