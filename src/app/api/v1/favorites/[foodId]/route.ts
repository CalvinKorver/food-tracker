import { toggleFavorite } from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import { fromZodError, jsonErr, jsonOk, parseUuidParam } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ foodId: string }> },
) {
  return withApiUser(request, async (user) => {
    const { foodId } = await params;
    const parsed = parseUuidParam(foodId);
    if (!parsed.success) return fromZodError(parsed.error);

    try {
      const result = await toggleFavorite(user.id, parsed.data);
      return jsonOk(result);
    } catch {
      return jsonErr("Could not update favorite");
    }
  });
}
