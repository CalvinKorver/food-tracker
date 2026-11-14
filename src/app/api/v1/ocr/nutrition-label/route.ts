import { parseNutritionLabelSchema } from "@food-tracker/contracts";
import {
  extractNutritionLabelFromImage,
  nutritionLabelToFormValues,
} from "@/lib/sources/nutrition-label-ocr";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

const MAX_IMAGE_CHARS = Math.ceil(1.5 * 1024 * 1024 * (4 / 3));

export async function POST(request: Request) {
  return withApiUser(request, async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return jsonErr("OPENAI_API_KEY is not configured", 503);
    }

    const body = await readJsonBody(request, parseNutritionLabelSchema, {
      maxBytes: 3_000_000,
    });
    if (!body.ok) return body.response;

    if (body.data.imageBase64.length > MAX_IMAGE_CHARS) {
      return jsonErr("Image is missing or too large", 400, {
        field: "imageBase64",
      });
    }

    try {
      const fields = await extractNutritionLabelFromImage({
        imageBase64: body.data.imageBase64,
        mimeType: body.data.mimeType,
        apiKey,
      });
      if (!fields.name) {
        return jsonErr(
          "Could not read a food name from the label. Try again.",
        );
      }
      return jsonOk({ values: nutritionLabelToFormValues(fields) });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to read nutrition label";
      return jsonErr(message);
    }
  });
}
