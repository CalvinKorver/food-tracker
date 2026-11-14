import { customFoodBodySchema } from "@food-tracker/contracts";
import {
  createCustomFood,
  parseCustomFoodInput,
  resolveUserFoodSource,
} from "@/lib/custom-food";
import { getFoodListItem } from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, customFoodBodySchema);
    if (!body.ok) return body.response;

    const parsed = parseCustomFoodInput({ ...body.data });
    if (!parsed.ok) {
      return jsonErr(parsed.error.message, 400, { field: parsed.error.field });
    }

    const created = await createCustomFood(user.id, parsed.data, {
      source: resolveUserFoodSource(body.data.source),
    });
    const food = await getFoodListItem(user.id, created.id);
    if (!food) return jsonErr("Failed to load created food", 500);
    return jsonOk(food, { status: 201 });
  });
}
