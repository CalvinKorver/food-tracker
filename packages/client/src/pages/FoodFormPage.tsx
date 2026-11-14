import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomFoodInputDto, OcrFoodPrefill } from "@food-tracker/contracts";
import { useApi } from "../config";

type FormValues = {
  name: string;
  brand: string;
  servingQty: string;
  servingUnit: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  sugarG: string;
  sodiumMg: string;
  satFatG: string;
  transFatG: string;
  cholesterolMg: string;
};

const emptyForm = (): FormValues => ({
  name: "",
  brand: "",
  servingQty: "100",
  servingUnit: "g",
  calories: "0",
  proteinG: "",
  carbsG: "",
  fatG: "",
  fiberG: "",
  sugarG: "",
  sodiumMg: "",
  satFatG: "",
  transFatG: "",
  cholesterolMg: "",
});

function num(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function toInput(values: FormValues, source: "custom" | "ocr"): CustomFoodInputDto {
  return {
    name: values.name,
    brand: values.brand.trim() === "" ? null : values.brand,
    servingQty: Number(values.servingQty),
    servingUnit: values.servingUnit,
    calories: Number(values.calories),
    proteinG: num(values.proteinG),
    carbsG: num(values.carbsG),
    fatG: num(values.fatG),
    fiberG: num(values.fiberG),
    sugarG: num(values.sugarG),
    sodiumMg: num(values.sodiumMg),
    satFatG: num(values.satFatG),
    transFatG: num(values.transFatG),
    cholesterolMg: num(values.cholesterolMg),
    source,
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-text-muted">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        required={required}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base text-text outline-none focus:border-accent"
      />
    </label>
  );
}

export function FoodFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const state = location.state as {
    prefill?: OcrFoodPrefill;
    source?: "custom" | "ocr";
    returnTo?: string;
  } | null;
  const source = state?.source ?? "custom";
  const returnTo = state?.returnTo ?? "/foods";

  const existing = useQuery({
    queryKey: ["food", id],
    queryFn: () => api.getFood(id!),
    enabled: mode === "edit" && Boolean(id),
  });

  const initial = useMemo<FormValues>(() => {
    if (state?.prefill) {
      const p = state.prefill;
      return {
        name: p.name ?? "",
        brand: p.brand ?? "",
        servingQty: p.servingQty || "100",
        servingUnit: p.servingUnit || "g",
        calories: p.calories || "0",
        proteinG: p.proteinG ?? "",
        carbsG: p.carbsG ?? "",
        fatG: p.fatG ?? "",
        fiberG: p.fiberG ?? "",
        sugarG: p.sugarG ?? "",
        sodiumMg: p.sodiumMg ?? "",
        satFatG: p.satFatG ?? "",
        transFatG: p.transFatG ?? "",
        cholesterolMg: p.cholesterolMg ?? "",
      };
    }
    if (existing.data) {
      const f = existing.data;
      return {
        ...emptyForm(),
        name: f.name,
        brand: f.brand ?? "",
        servingQty: String(f.servingQty),
        servingUnit: f.servingUnit,
        calories: String(f.calories),
        proteinG: String(f.proteinG),
        carbsG: String(f.carbsG),
        fatG: String(f.fatG),
        fiberG: String(f.fiberG),
        sugarG: String(f.sugarG),
        sodiumMg: String(f.sodiumMg),
      };
    }
    return emptyForm();
  }, [existing.data, state?.prefill]);

  const [values, setValues] = useState<FormValues | null>(null);
  const form = values ?? initial;
  const set = (key: keyof FormValues) => (v: string) =>
    setValues({ ...(values ?? initial), [key]: v });

  const save = useMutation({
    mutationFn: () => {
      const input = toInput(form, source);
      return mode === "edit" && id
        ? api.updateCustomFood(id, input)
        : api.createCustomFood(input);
    },
    onSuccess: async (food) => {
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
      if (returnTo.startsWith("/diary/") && returnTo.includes("add=")) {
        const url = new URL(returnTo, "http://local.invalid");
        url.searchParams.set("foodId", food.id);
        navigate(`${url.pathname}?${url.searchParams.toString()}`);
        return;
      }
      navigate(returnTo.startsWith("/") ? returnTo : "/foods");
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteCustomFood(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["foods"] });
      navigate("/foods");
    },
  });

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center gap-3">
        <Link
          to={mode === "edit" ? "/foods" : returnTo}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          {mode === "edit" ? "Edit food" : "New custom food"}
        </h1>
      </header>

      {mode === "edit" && existing.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Name" required value={form.name} onChange={set("name")} />
          <Field label="Brand" value={form.brand} onChange={set("brand")} />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Serving size"
              type="number"
              required
              value={form.servingQty}
              onChange={set("servingQty")}
            />
            <Field
              label="Unit"
              required
              value={form.servingUnit}
              onChange={set("servingUnit")}
            />
          </div>
          <Field
            label="Calories"
            type="number"
            required
            value={form.calories}
            onChange={set("calories")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Protein (g)" type="number" value={form.proteinG} onChange={set("proteinG")} />
            <Field label="Carbs (g)" type="number" value={form.carbsG} onChange={set("carbsG")} />
            <Field label="Fat (g)" type="number" value={form.fatG} onChange={set("fatG")} />
            <Field label="Fiber (g)" type="number" value={form.fiberG} onChange={set("fiberG")} />
            <Field label="Sugar (g)" type="number" value={form.sugarG} onChange={set("sugarG")} />
            <Field label="Sodium (mg)" type="number" value={form.sodiumMg} onChange={set("sodiumMg")} />
            <Field label="Sat fat (g)" type="number" value={form.satFatG} onChange={set("satFatG")} />
            <Field label="Trans fat (g)" type="number" value={form.transFatG} onChange={set("transFatG")} />
            <Field
              label="Cholesterol (mg)"
              type="number"
              value={form.cholesterolMg}
              onChange={set("cholesterolMg")}
            />
          </div>
          {save.error ? (
            <p className="text-sm text-danger">{(save.error as Error).message}</p>
          ) : null}
          <button
            type="submit"
            disabled={save.isPending}
            className="w-full rounded-2xl bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : mode === "create" ? "Create food" : "Save changes"}
          </button>
          {mode === "edit" && id ? (
            <button
              type="button"
              disabled={remove.isPending}
              className="w-full rounded-2xl border border-danger/40 py-3 text-sm font-medium text-danger disabled:opacity-50"
              onClick={() => {
                if (confirm("Delete this food?")) remove.mutate();
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete food"}
            </button>
          ) : null}
        </form>
      )}
    </div>
  );
}
