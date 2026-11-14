import { createRecipeSchema } from "@food-tracker/contracts";
import { getFoodListItem } from "@/lib/foods";
import { createRecipe } from "@/lib/recipes";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, createRecipeSchema);
    if (!body.ok) return body.response;

    try {
      const recipe = await createRecipe(user.id, body.data);
      const food = await getFoodListItem(user.id, recipe.id);
      if (!food) return jsonErr("Failed to load created recipe", 500);
      return jsonOk(food, { status: 201 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create recipe";
      return jsonErr(message);
    }
  });
}
