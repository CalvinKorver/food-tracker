"use client";

import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/shell/BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-[0_0_0_1px_var(--border)]">
        <main className="flex-1 px-4 pb-[calc(var(--nav-height)+1.5rem)] pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav onAdd={() => router.push("/diary/today?add=snack")} />
      </div>
    </div>
  );
}
