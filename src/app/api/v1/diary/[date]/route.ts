import { resolveDiaryDate } from "@/lib/dates";
import { getDiaryDay } from "@/lib/diary";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { toDiaryDayDto } from "@/lib/api/serializers";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  return withApiUser(request, async (user) => {
    const { date } = await params;
    const resolved = resolveDiaryDate(date, user.timezone);
    if (!resolved) {
      return jsonErr("Invalid date", 400, { field: "date" });
    }

    const day = await getDiaryDay(user.id, resolved.date);
    return jsonOk(toDiaryDayDto(day, resolved));
  });
}
