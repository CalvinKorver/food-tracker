import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApiUser } from "@/lib/api/cors";
import { jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

const calorieNagSchema = z.object({
  enabled: z.boolean(),
});

export async function PUT(request: Request) {
  return withApiUser(request, async (user) => {
    const body = await readJsonBody(request, calorieNagSchema);
    if (!body.ok) return body.response;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { calorieNagEnabled: body.data.enabled },
    });

    return jsonOk({ enabled: updated.calorieNagEnabled });
  });
}
