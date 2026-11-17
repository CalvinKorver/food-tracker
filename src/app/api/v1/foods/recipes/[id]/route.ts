import { createRecipeSchema } from "@food-tracker/contracts";
import { getFoodListItem } from "@/lib/foods";
import { getRecipeDetail, updateRecipe } from "@/lib/recipes";
import { withApiUser } from "@/lib/api/cors";
import {
  fromZodError,
  jsonErr,
  jsonOk,
  parseUuidParam,
  readJsonBody,
} from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiUser(request, async (user) => {
    const { id } = await params;
    const parsed = parseUuidParam(id);
    if (!parsed.success) return fromZodError(parsed.error);

    const recipe = await getRecipeDetail(user.id, parsed.data);
    if (!recipe) return jsonErr("Recipe not found", 404);
    return jsonOk(recipe);
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiUser(request, async (user) => {
    const { id } = await params;
    const idParsed = parseUuidParam(id);
    if (!idParsed.success) return fromZodError(idParsed.error);

    const body = await readJsonBody(request, createRecipeSchema);
    if (!body.ok) return body.response;

    try {
      await updateRecipe(user.id, idParsed.data, body.data);
      const food = await getFoodListItem(user.id, idParsed.data);
      if (!food) return jsonErr("Recipe not found", 404);
      return jsonOk(food);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update recipe";
      const status = message === "Recipe not found" ? 404 : 400;
      return jsonErr(message, status);
    }
  });
}
