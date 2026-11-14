import { prisma } from "@/lib/db";
import { withApiUser } from "@/lib/api/cors";
import { jsonOk } from "@/lib/api/http";
import { toSessionUser } from "@/lib/api/serializers";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async (user) => {
    const [foods, entries, favorites] = await Promise.all([
      prisma.food.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.foodEntry.findMany({
        where: { userId: user.id },
        orderBy: [{ loggedOn: "asc" }, { createdAt: "asc" }],
      }),
      prisma.favorite.findMany({
        where: { userId: user.id },
        select: { foodId: true },
      }),
    ]);

    return jsonOk({
      exportedAt: new Date().toISOString(),
      user: toSessionUser(user),
      foods,
      entries,
      favorites: favorites.map((row) => row.foodId),
    });
  });
}
