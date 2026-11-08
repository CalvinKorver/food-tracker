import Link from "next/link";
import { ThemePreferenceControl } from "@/components/more/ThemePreferenceControl";

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6 pt-1">
      <h1 className="text-lg font-semibold tracking-tight">More</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold text-text">Appearance</h2>
        <p className="text-sm text-text-muted">
          Follow system settings, or lock light or dark.
        </p>
        <ThemePreferenceControl />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-semibold text-text">Settings</h2>
        <Link
          href="/more/goals"
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-[17px] text-text transition hover:bg-surface-hover"
        >
          <span>Goals</span>
          <span className="text-text-muted" aria-hidden>
            ›
          </span>
        </Link>
      </section>
    </div>
  );
}
