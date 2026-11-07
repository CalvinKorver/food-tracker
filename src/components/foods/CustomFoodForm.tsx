"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCustomFoodAction,
  deleteCustomFoodAction,
  updateCustomFoodAction,
} from "@/app/foods/actions";
import {
  NutritionConfirmation,
  type ConfirmationNutrients,
} from "@/components/foods/NutritionConfirmation";
import type { CustomFoodFormValues } from "@/lib/custom-food-form";

type CustomFoodFormProps = {
  mode: "create" | "edit";
  initial: CustomFoodFormValues;
  returnTo?: string;
  source?: "custom" | "ocr";
};

function Field({
  label,
  name,
  type = "text",
  required,
  step,
  min,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-text-muted">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        step={step}
        min={min}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base text-text outline-none focus:border-accent"
      />
    </label>
  );
}

function num(raw: FormDataEntryValue | null): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function CustomFoodForm({
  mode,
  initial,
  returnTo,
  source = "custom",
}: CustomFoodFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [review, setReview] = useState<{
    formData: FormData;
    nutrients: ConfirmationNutrients;
    title: string;
    servingLabel: string;
  } | null>(null);

  if (mode === "create" && review) {
    return (
      <div className="min-h-[70dvh]">
        <NutritionConfirmation
          title={review.title}
          nutrients={review.nutrients}
          servingOptions={[
            {
              id: "serving",
              label: review.servingLabel,
              multiplier: 1,
            },
          ]}
          saveLabel="Create food"
          pending={pending}
          error={error}
          onBack={() => {
            setReview(null);
            setError(null);
          }}
          onSave={() => {
            setError(null);
            startTransition(async () => {
              const result = await createCustomFoodAction(review.formData);
              if (result && !result.ok) {
                setError(result.error);
              }
            });
          }}
        />
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setError(null);
        if (mode === "create") {
          const title = String(formData.get("name") ?? "").trim() || "Custom food";
          const qty = num(formData.get("servingQty"));
          const unit = String(formData.get("servingUnit") ?? "").trim() || "serving";
          setReview({
            formData,
            title,
            servingLabel: `1 serving — ${qty} ${unit}`,
            nutrients: {
              calories: num(formData.get("calories")),
              proteinG: num(formData.get("proteinG")),
              carbsG: num(formData.get("carbsG")),
              fatG: num(formData.get("fatG")),
              fiberG: num(formData.get("fiberG")),
              sugarG: num(formData.get("sugarG")),
              sodiumMg: num(formData.get("sodiumMg")),
            },
          });
          return;
        }
        startTransition(async () => {
          const result = await updateCustomFoodAction(formData);
          if (result && !result.ok) {
            setError(result.error);
          }
        });
      }}
    >
      {mode === "edit" && initial.id ? (
        <input type="hidden" name="foodId" value={initial.id} />
      ) : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {mode === "create" ? (
        <input type="hidden" name="source" value={source} />
      ) : null}

      <Field label="Name" name="name" required defaultValue={initial.name} />
      <Field
        label="Brand"
        name="brand"
        defaultValue={initial.brand}
        placeholder="Optional"
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Serving size"
          name="servingQty"
          type="number"
          required
          step="any"
          min="0.01"
          defaultValue={initial.servingQty}
        />
        <Field
          label="Unit"
          name="servingUnit"
          required
          defaultValue={initial.servingUnit}
          placeholder="g, cup, ml…"
        />
      </div>

      <Field
        label="Calories"
        name="calories"
        type="number"
        required
        step="any"
        min="0"
        defaultValue={initial.calories}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Protein (g)"
          name="proteinG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.proteinG}
        />
        <Field
          label="Carbs (g)"
          name="carbsG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.carbsG}
        />
        <Field
          label="Fat (g)"
          name="fatG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.fatG}
        />
        <Field
          label="Fiber (g)"
          name="fiberG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.fiberG}
        />
        <Field
          label="Sugar (g)"
          name="sugarG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.sugarG}
        />
        <Field
          label="Sodium (mg)"
          name="sodiumMg"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.sodiumMg}
        />
        <Field
          label="Sat fat (g)"
          name="satFatG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.satFatG}
        />
        <Field
          label="Trans fat (g)"
          name="transFatG"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.transFatG}
        />
        <Field
          label="Cholesterol (mg)"
          name="cholesterolMg"
          type="number"
          step="any"
          min="0"
          defaultValue={initial.cholesterolMg}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-accent py-3.5 text-base font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
      >
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Next"
            : "Save changes"}
      </button>

      {mode === "edit" && initial.id ? (
        <button
          type="button"
          disabled={deleting}
          className="w-full rounded-2xl border border-danger/40 py-3 text-sm font-medium text-danger disabled:opacity-50"
          onClick={() => {
            if (!confirm("Delete this food?")) return;
            setError(null);
            startDelete(async () => {
              const result = await deleteCustomFoodAction(initial.id!);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push("/foods");
              router.refresh();
            });
          }}
        >
          {deleting ? "Deleting…" : "Delete food"}
        </button>
      ) : null}
    </form>
  );
}
