import { userGoalsSchema } from "@food-tracker/contracts";
import { prisma } from "@/lib/db";
import { parseGoalInput } from "@/lib/goals";
import { withApiUser } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";
import { toGoals } from "@/lib/api/serializers";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async (user) => jsonOk(toGoals(user)));
}

export async function PUT(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, userGoalsSchema);
    if (!body.ok) return body.response;

    const parsed = parseGoalInput(body.data);
    if (!parsed.ok) {
      return jsonErr(parsed.error.message, 400, { field: parsed.error.field });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        calorieGoal: parsed.data.calorieGoal,
        proteinGoalG: parsed.data.proteinGoalG,
        carbsGoalG: parsed.data.carbsGoalG,
        fatGoalG: parsed.data.fatGoalG,
      },
    });

    return jsonOk(toGoals(updated));
  });
}
