import { customFoodBodySchema } from "@food-tracker/contracts";
import {
  deleteCustomFood,
  parseCustomFoodInput,
  updateCustomFood,
} from "@/lib/custom-food";
import { getFoodListItem } from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import { fromZodError, jsonErr, jsonOk, parseUuidParam, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiUser(request, async (user) => {
    const { id } = await params;
    const parsed = parseUuidParam(id);
    if (!parsed.success) return fromZodError(parsed.error);

    const food = await getFoodListItem(user.id, parsed.data);
    if (!food) return jsonErr("Food not found", 404);
    return jsonOk(food);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiUser(request, async (user) => {
    const { id } = await params;
    const idParsed = parseUuidParam(id);
    if (!idParsed.success) return fromZodError(idParsed.error);

    const body = await readJsonBody(request, customFoodBodySchema);
    if (!body.ok) return body.response;

    const parsed = parseCustomFoodInput({ ...body.data });
    if (!parsed.ok) {
      return jsonErr(parsed.error.message, 400, { field: parsed.error.field });
    }

    try {
      await updateCustomFood(user.id, idParsed.data, parsed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      if (message === "Food not found") {
        return jsonErr(message, 404);
      }
      return jsonErr(message, 500);
    }

    const food = await getFoodListItem(user.id, idParsed.data);
    if (!food) return jsonErr("Food not found", 404);
    return jsonOk(food);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiUser(request, async (user) => {
    const { id } = await params;
    const parsed = parseUuidParam(id);
    if (!parsed.success) return fromZodError(parsed.error);

    const result = await deleteCustomFood(user.id, parsed.data);
    if (!result.ok) {
      const status = result.error === "Food not found" ? 404 : 400;
      return jsonErr(result.error, status);
    }
    return jsonOk({ deleted: true });
  });
}
