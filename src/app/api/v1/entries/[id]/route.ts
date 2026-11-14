import { deleteFoodEntry } from "@/lib/diary";
import { withApiUser } from "@/lib/api/cors";
import { fromZodError, jsonErr, jsonOk, parseUuidParam } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

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
