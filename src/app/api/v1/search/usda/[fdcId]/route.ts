import { selectUsdaFood } from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fdcId: string }> },
) {
  return withApiUser(request, async (user) => {
    const { fdcId } = await params;
    if (!fdcId.trim()) {
      return jsonErr("Invalid USDA food id", 400, { field: "fdcId" });
    }

    try {
      const food = await selectUsdaFood(fdcId, user.id);
      return jsonOk({ food });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load USDA food";
      return jsonErr(message);
    }
  });
}
