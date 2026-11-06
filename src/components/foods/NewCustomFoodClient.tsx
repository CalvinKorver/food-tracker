"use client";

import { useEffect, useState } from "react";
import { CustomFoodForm } from "@/components/foods/CustomFoodForm";
import {
  OCR_PREFILL_STORAGE_KEY,
  emptyCustomFoodFormValues,
  type CustomFoodFormValues,
  type OcrFoodPrefill,
} from "@/lib/custom-food-form";

type NewCustomFoodClientProps = {
  returnTo: string;
};

export function NewCustomFoodClient({ returnTo }: NewCustomFoodClientProps) {
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<CustomFoodFormValues>(
    emptyCustomFoodFormValues(),
  );
  const [source, setSource] = useState<"custom" | "ocr">("custom");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(OCR_PREFILL_STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(OCR_PREFILL_STORAGE_KEY);
        const parsed = JSON.parse(raw) as OcrFoodPrefill;
        const { source: parsedSource, ...fields } = parsed;
        setInitial(fields);
        if (parsedSource === "ocr") setSource("ocr");
      }
    } catch {
      // ignore corrupt prefill
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">Loading…</p>
    );
  }

  return (
    <CustomFoodForm
      mode="create"
      initial={initial}
      returnTo={returnTo}
      source={source}
    />
  );
}
