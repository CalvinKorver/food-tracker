import { updateFoodEntrySchema } from "@food-tracker/contracts";
import { deleteFoodEntry } from "@/lib/diary";
import { updateFoodEntry } from "@/lib/foods";
import { withApiUser } from "@/lib/api/cors";
import {
  fromZodError,
  jsonErr,
  jsonOk,
  parseUuidParam,
  readJsonBody,
} from "@/lib/api/http";
import { toDiaryEntryDto } from "@/lib/api/serializers";
import type { MealType } from "@/generated/prisma/client";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiUser(request, async (user) => {
    const { id } = await params;
    const idParsed = parseUuidParam(id);
    if (!idParsed.success) return fromZodError(idParsed.error);

    const body = await readJsonBody(request, updateFoodEntrySchema);
    if (!body.ok) return body.response;

    const entry = await updateFoodEntry(user.id, idParsed.data, {
      quantity: body.data.quantity,
      meal: body.data.meal as MealType,
    });
    if (!entry) {
      return jsonErr("Entry not found", 404);
    }
    return jsonOk(toDiaryEntryDto(entry));
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

    const deleted = await deleteFoodEntry(user.id, parsed.data);
    if (!deleted) {
      return jsonErr("Entry not found", 404);
    }
    return jsonOk({ deleted: true });
  });
}
