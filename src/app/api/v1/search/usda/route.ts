import { searchQuerySchema } from "@food-tracker/contracts";
import { withApiUser } from "@/lib/api/cors";
import { fromZodError, jsonErr, jsonOk } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async () => {
    const url = new URL(request.url);
    const parsed = searchQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? "",
    });
    if (!parsed.success) return fromZodError(parsed.error);

    try {
      const { searchFdcFoods } = await import("@/lib/sources/usda-fdc");
      const foods = await searchFdcFoods(parsed.data.q);
      return jsonOk({ foods });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to search foods";
      return jsonErr(message);
    }
  });
}
