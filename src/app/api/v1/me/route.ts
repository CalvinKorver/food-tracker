import { prisma } from "@/lib/db";
import { withApiUser } from "@/lib/api/cors";
import { jsonOk } from "@/lib/api/http";
import { toSessionUser } from "@/lib/api/serializers";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async (user) => jsonOk(toSessionUser(user)));
}

export async function DELETE(request: Request) {
  return withApiUser(request, async (user) => {
    await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({
        where: {
          OR: [
            { recipe: { userId: user.id } },
            { ingredient: { userId: user.id } },
          ],
        },
      });
      await tx.foodEntry.deleteMany({ where: { userId: user.id } });
      await tx.favorite.deleteMany({ where: { userId: user.id } });
      await tx.food.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });
    return jsonOk({ deleted: true });
  });
}
