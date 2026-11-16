import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { FoodListItem } from "@food-tracker/contracts";
import { DEFAULT_MEAL_WINDOWS, suggestedMealForLocalTime } from "@food-tracker/domain";
import { useAuth } from "../../auth";
import { useApi } from "../../config";
import { usePlatform } from "../../platform";
import { StatusBanners } from "../StatusBanners";
import { AddOptionsSheet } from "./AddOptionsSheet";
import { BottomNav } from "./BottomNav";

function diaryDateKeyFromPath(pathname: string): string {
  const match = pathname.match(/^\/diary\/([^/]+)/);
  return match?.[1] ?? "today";
}

export function AppShell() {
  const { user } = useAuth();
  const api = useApi();
  const { barcode, camera } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const handoffPending = useRef(false);

  useEffect(() => {
    const selectedFood = (
      location.state as { selectedFood?: FoodListItem } | null
    )?.selectedFood;
    if (!handoffPending.current || !selectedFood) return;
    const frame = requestAnimationFrame(() => {
      handoffPending.current = false;
      barcode.dismiss();
    });
    return () => cancelAnimationFrame(frame);
  }, [barcode, location]);

  const hideChrome =
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/consent" ||
    pathname.startsWith("/consent/");

  const dateKey = diaryDateKeyFromPath(pathname);
  const meal = suggestedMealForLocalTime(
    new Date(),
    user?.mealWindows ?? DEFAULT_MEAL_WINDOWS,
  );
  const addPath = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({ add: meal, ...extra });
    return `/diary/${dateKey}?${params}`;
  };

  async function onScanBarcode() {
    setBusy(null);
    try {
      const code = await barcode.scan();
      if (!code) {
        barcode.dismiss();
        return;
      }
      const { food } = await api.lookupBarcode(code);
      handoffPending.current = true;
      navigate(addPath({ foodId: food.id }), {
        state: { selectedFood: food },
      });
    } catch (err) {
      barcode.dismiss();
      setBusy(err instanceof Error ? err.message : "Barcode lookup failed");
    }
  }

  async function onScanLabel() {
    setBusy(null);
    const capture = await camera.captureJpeg();
    if (!capture) return;
    try {
      const { values } = await api.parseNutritionLabel(capture);
      navigate("/foods/new", { state: { prefill: values, source: "ocr" } });
    } catch (err) {
      setBusy(err instanceof Error ? err.message : "Could not read label");
    }
  }

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
          <StatusBanners />
          {busy ? (
            <p className="mb-3 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger">
              {busy}
            </p>
          ) : null}
          <Outlet />
        </main>
        {hideChrome ? null : (
          <>
            <BottomNav onAdd={() => setAddOpen(true)} />
            <AddOptionsSheet
              open={addOpen}
              onClose={() => setAddOpen(false)}
              onSearchFood={() => navigate(addPath())}
              onScanBarcode={() => void onScanBarcode()}
              onScanLabel={() => void onScanLabel()}
            />
          </>
        )}
      </div>
    </div>
  );
}
