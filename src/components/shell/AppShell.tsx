"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AddOptionsSheet } from "@/components/shell/AddOptionsSheet";
import { BottomNav } from "@/components/shell/BottomNav";
import { BarcodeScannerScreen } from "@/components/foods/BarcodeScannerScreen";
import { LabelCaptureScreen } from "@/components/foods/LabelCaptureScreen";
import type { FoodListItem } from "@/lib/food-shared";

function diaryDateKeyFromPath(pathname: string): string {
  const match = pathname.match(/^\/diary\/([^/]+)/);
  return match?.[1] ?? "today";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [overlay, setOverlay] = useState<"barcode" | "label" | null>(null);

  const dateKey = diaryDateKeyFromPath(pathname);
  const diaryAddReturnTo = `/diary/${dateKey}?add=snack`;

  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-[0_0_0_1px_var(--border)]">
        <main className="flex-1 px-4 pb-[calc(var(--nav-height)+1.5rem)] pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav onAdd={() => setAddOpen(true)} />
        <AddOptionsSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSearchFood={() =>
            router.push(diaryAddReturnTo, { transitionTypes: ["sheet-open"] })
          }
          onScanBarcode={() => setOverlay("barcode")}
          onScanLabel={() => setOverlay("label")}
        />
        <BarcodeScannerScreen
          open={overlay === "barcode"}
          onClose={() => setOverlay(null)}
          onFound={(food: FoodListItem) => {
            setOverlay(null);
            router.push(`/diary/${dateKey}?add=snack&foodId=${food.id}`, {
              transitionTypes: ["sheet-open"],
            });
          }}
        />
        <LabelCaptureScreen
          open={overlay === "label"}
          onClose={() => setOverlay(null)}
          returnTo={diaryAddReturnTo}
        />
      </div>
    </div>
  );
}
