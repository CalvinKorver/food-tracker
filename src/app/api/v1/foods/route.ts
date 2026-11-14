import { z } from "zod";
import {
  listAllCustomFoods,
  listAllFoods,
  listFavoriteFoods,
  listRecentFoods,
} from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import { fromZodError, jsonOk } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

const foodsQuerySchema = z.object({
  tab: z.enum(["recents", "favorites", "all", "custom"]).default("recents"),
  q: z.string().optional(),
});

export async function GET(request: Request) {
  return withApiUser(request, async (user) => {
    const url = new URL(request.url);
    const parsed = foodsQuerySchema.safeParse({
      tab: url.searchParams.get("tab") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) return fromZodError(parsed.error);

    const { tab, q } = parsed.data;
    let foods =
      tab === "recents"
        ? await listRecentFoods(user.id)
        : tab === "favorites"
          ? await listFavoriteFoods(user.id)
          : tab === "custom"
            ? await listAllCustomFoods(user.id)
            : await listAllFoods(user.id);

    const needle = q?.trim().toLowerCase() ?? "";
    if (needle) {
      foods = foods.filter(
        (food) =>
          food.name.toLowerCase().includes(needle) ||
          (food.brand?.toLowerCase().includes(needle) ?? false),
      );
    }

    return jsonOk(foods);
  });
}
