import { saveMealWindowsSchema } from "@food-tracker/contracts";
import { prisma } from "@/lib/db";
import { parseMealWindowsInput } from "@/lib/meal-windows";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";
import { toMealWindows } from "@/lib/api/serializers";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async (user) => jsonOk(toMealWindows(user)));
}

export async function PUT(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, saveMealWindowsSchema);
    if (!body.ok) return body.response;

    const parsed = parseMealWindowsInput(body.data);
    if (!parsed.ok) {
      return jsonErr(parsed.error);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { mealWindows: parsed.data },
    });

    return jsonOk(toMealWindows(updated));
  });
}
