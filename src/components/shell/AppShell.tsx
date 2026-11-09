"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AddOptionsSheet } from "@/components/shell/AddOptionsSheet";
import { BottomNav } from "@/components/shell/BottomNav";
import { BarcodeScannerScreen } from "@/components/foods/BarcodeScannerScreen";
import { LabelCaptureScreen } from "@/components/foods/LabelCaptureScreen";
import type { FoodListItem } from "@/lib/food-shared";
import {
  suggestedMealForLocalTime,
  type MealWindows,
} from "@/lib/meal-windows";

function diaryDateKeyFromPath(pathname: string): string {
  const match = pathname.match(/^\/diary\/([^/]+)/);
  return match?.[1] ?? "today";
}

export function AppShell({
  children,
  mealWindows,
}: {
  children: React.ReactNode;
  mealWindows: MealWindows;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [overlay, setOverlay] = useState<"barcode" | "label" | null>(null);

  const dateKey = diaryDateKeyFromPath(pathname);
  const addPath = () =>
    `/diary/${dateKey}?add=${suggestedMealForLocalTime(new Date(), mealWindows)}`;
  const hideChrome =
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/consent" ||
    pathname.startsWith("/consent/");

  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-[0_0_0_1px_var(--border)]">
        <main
          className={
            hideChrome
              ? "flex-1 px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]"
              : "flex-1 px-4 pb-[calc(var(--nav-height)+0.75rem)] pt-[max(1rem,env(safe-area-inset-top))]"
          }
        >
          {children}
        </main>
        {hideChrome ? null : (
          <>
            <BottomNav onAdd={() => setAddOpen(true)} />
            <AddOptionsSheet
              open={addOpen}
              onClose={() => setAddOpen(false)}
              onSearchFood={() =>
                router.push(addPath(), {
                  transitionTypes: ["sheet-open"],
                })
              }
              onScanBarcode={() => setOverlay("barcode")}
              onScanLabel={() => setOverlay("label")}
            />
            <BarcodeScannerScreen
              open={overlay === "barcode"}
              onClose={() => setOverlay(null)}
              onFound={(food: FoodListItem) => {
                setOverlay(null);
                router.push(`${addPath()}&foodId=${food.id}`, {
                  transitionTypes: ["sheet-open"],
                });
              }}
            />
            <LabelCaptureScreen
              open={overlay === "label"}
              onClose={() => setOverlay(null)}
              returnTo={addPath()}
            />
          </>
        )}
      </div>
    </div>
  );
}
