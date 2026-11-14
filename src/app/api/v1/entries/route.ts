import { addFoodEntrySchema } from "@food-tracker/contracts";
import { dateFromKey } from "@/lib/dates";
import { createFoodEntry } from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";
import { toDiaryEntryDto } from "@/lib/api/serializers";
import type { MealType } from "@/generated/prisma/client";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, addFoodEntrySchema);
    if (!body.ok) return body.response;

    try {
      const entry = await createFoodEntry({
        userId: user.id,
        foodId: body.data.foodId,
        loggedOn: dateFromKey(body.data.loggedOnKey),
        meal: body.data.meal as MealType,
        quantity: body.data.quantity,
        unitMode: body.data.unitMode,
        selectedUnit: body.data.selectedUnit,
      });
      return jsonOk(toDiaryEntryDto(entry));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add food";
      return jsonErr(message);
    }
  });
}
