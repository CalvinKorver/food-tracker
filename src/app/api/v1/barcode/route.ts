import { barcodeSchema } from "@food-tracker/contracts";
import { upsertOffFood } from "@/lib/foods";
import { openFoodFactsAdapter } from "@/lib/sources/open-food-facts";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, barcodeSchema);
    if (!body.ok) return body.response;

    try {
      const normalized = await openFoodFactsAdapter.getByBarcode(body.data.code);
      if (!normalized) {
        return jsonErr("Product not found", 404);
      }
      const food = await upsertOffFood(normalized, user.id);
      return jsonOk({ food });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to look up barcode";
      return jsonErr(message);
    }
  });
}
