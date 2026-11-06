import {
  emptyCustomFoodFormValues,
  type OcrFoodPrefill,
} from "@/lib/custom-food-form";

export type NutritionLabelOcrFields = {
  name: string | null;
  brand: string | null;
  servingQty: number | null;
  servingUnit: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  satFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
};

const SYSTEM_PROMPT = `You extract nutrition facts from a photo of a food menu card or nutrition label.
Return ONLY a JSON object with these keys (use null when unknown):
name, brand, servingQty, servingUnit, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, satFatG, transFatG, cholesterolMg.

Layout (critical):
- Workplace/cafeteria cards often use a 4-column table per row: attribute, value, attribute, value
  (e.g. "Calories 200 | Sodium 760mg", then "Total Fat 2.5g | Total Carbohydrate 23g", then "… | Protein 20g").
- Read BOTH pairs on every row. Never skip the right-hand attribute/value. Never attach a right-column value to a left-column nutrient.
- Synonyms → keys: Total Fat→fatG, Saturated Fat→satFatG, Trans Fat→transFatG, Cholesterol→cholesterolMg, Sodium→sodiumMg, Total Carbohydrate→carbsG, Dietary Fiber→fiberG, Sugars→sugarG, Protein→proteinG, Calories→calories.
- Strip units; store bare numbers (g→proteinG/carbsG/fatG/fiberG/sugarG/satFatG/transFatG; mg→sodiumMg/cholesterolMg). Use 0 when the label shows 0; null only if absent.
- Serving Size like "8.0 oz." → servingQty 8, servingUnit "oz". Do not invent "1" / "serving" when an amount+unit is printed.
- name = dish/product title; brand may be null for workplace menus.`;

function numOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

export function parseNutritionLabelJson(
  raw: unknown,
): NutritionLabelOcrFields {
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  return {
    name: strOrNull(obj.name),
    brand: strOrNull(obj.brand),
    servingQty: numOrNull(obj.servingQty),
    servingUnit: strOrNull(obj.servingUnit),
    calories: numOrNull(obj.calories),
    proteinG: numOrNull(obj.proteinG),
    carbsG: numOrNull(obj.carbsG),
    fatG: numOrNull(obj.fatG),
    fiberG: numOrNull(obj.fiberG),
    sugarG: numOrNull(obj.sugarG),
    sodiumMg: numOrNull(obj.sodiumMg),
    satFatG: numOrNull(obj.satFatG),
    transFatG: numOrNull(obj.transFatG),
    cholesterolMg: numOrNull(obj.cholesterolMg),
  };
}

export function nutritionLabelToFormValues(
  fields: NutritionLabelOcrFields,
): OcrFoodPrefill {
  const base = emptyCustomFoodFormValues();
  return {
    ...base,
    source: "ocr",
    name: fields.name ?? "",
    brand: fields.brand ?? "",
    servingQty:
      fields.servingQty !== null && fields.servingQty > 0
        ? String(fields.servingQty)
        : base.servingQty,
    servingUnit: fields.servingUnit ?? base.servingUnit,
    calories:
      fields.calories !== null && fields.calories >= 0
        ? String(fields.calories)
        : base.calories,
    proteinG: fields.proteinG === null ? "" : String(fields.proteinG),
    carbsG: fields.carbsG === null ? "" : String(fields.carbsG),
    fatG: fields.fatG === null ? "" : String(fields.fatG),
    fiberG: fields.fiberG === null ? "" : String(fields.fiberG),
    sugarG: fields.sugarG === null ? "" : String(fields.sugarG),
    sodiumMg: fields.sodiumMg === null ? "" : String(fields.sodiumMg),
    satFatG: fields.satFatG === null ? "" : String(fields.satFatG),
    transFatG: fields.transFatG === null ? "" : String(fields.transFatG),
    cholesterolMg:
      fields.cholesterolMg === null ? "" : String(fields.cholesterolMg),
  };
}

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

export async function extractNutritionLabelFromImage(input: {
  imageBase64: string;
  mimeType: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}): Promise<NutritionLabelOcrFields> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

  const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract nutrition facts from this image. If the nutrition block is a 4-column attribute/value/attribute/value table, read every left and right pair.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  const body = (await res.json()) as OpenAiChatResponse;
  if (!res.ok) {
    throw new Error(
      body.error?.message ?? `OpenAI request failed (${res.status})`,
    );
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const fields = parseNutritionLabelJson(parsed);
  // shortcut: noisy in prod — drop once OCR pairing is solid
  console.info("[ocr] imageBytes≈", Math.round((input.imageBase64.length * 3) / 4), {
    mimeType: input.mimeType,
  });
  console.info("[ocr] raw model JSON:", content);
  console.info("[ocr] parsed fields:", fields);

  return fields;
}
