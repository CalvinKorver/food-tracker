"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AddOptionsSheet } from "@/components/shell/AddOptionsSheet";
import { BottomNav } from "@/components/shell/BottomNav";
import { BarcodeScannerScreen } from "@/components/foods/BarcodeScannerScreen";
import type { FoodListItem } from "@/lib/food-shared";

function diaryDateKeyFromPath(pathname: string): string {
  const match = pathname.match(/^\/diary\/([^/]+)/);
  return match?.[1] ?? "today";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const closeAdd = useCallback(() => setAddOpen(false), []);
  const closeScan = useCallback(() => setScanOpen(false), []);

  const searchFood = useCallback(() => {
    const dateKey = diaryDateKeyFromPath(pathname);
    router.push(`/diary/${dateKey}?add=snack`);
  }, [pathname, router]);

  const openScan = useCallback(() => {
    setAddOpen(false);
    setScanOpen(true);
  }, []);

  const onBarcodeFound = useCallback(
    (food: FoodListItem) => {
      setScanOpen(false);
      const dateKey = diaryDateKeyFromPath(pathname);
      router.push(`/diary/${dateKey}?add=snack&foodId=${food.id}`);
    },
    [pathname, router],
  );

  return (
    <div className="min-h-dvh bg-bg text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--app-max-width)] flex-col bg-bg shadow-[0_0_0_1px_var(--border)]">
        <main className="flex-1 px-4 pb-[calc(var(--nav-height)+1.5rem)] pt-[max(1rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav onAdd={() => setAddOpen(true)} />
        <AddOptionsSheet
          open={addOpen}
          onClose={closeAdd}
          onSearchFood={searchFood}
          onScanBarcode={openScan}
        />
        <BarcodeScannerScreen
          open={scanOpen}
          onClose={closeScan}
          onFound={onBarcodeFound}
        />
      </div>
    </div>
  );
}
