import { z } from "zod";
import { prisma } from "@/lib/db";
import { withApiUser } from "@/lib/api/cors";
import { jsonOk, readJsonBody } from "@/lib/api/http";

export { OPTIONS } from "@/app/api/v1/_cors";

const bodySchema = z.object({
  token: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
});

/** Revoke the current bearer access token and/or a refresh token. */
export async function POST(request: Request) {
  return withApiUser(request, async (user) => {
    const parsed = await readJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const now = new Date();
    const authorization = request.headers.get("authorization");
    const bearer = authorization?.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : null;
    const accessToken = parsed.data.token ?? bearer;

    if (accessToken) {
      await prisma.oauthAccessToken.updateMany({
        where: { token: accessToken, userId: user.id, revoked: null },
        data: { revoked: now },
      });
    }

    if (parsed.data.refreshToken) {
      await prisma.oauthRefreshToken.updateMany({
        where: {
          token: parsed.data.refreshToken,
          userId: user.id,
          revoked: null,
        },
        data: { revoked: now },
      });
    }

    return jsonOk({ revoked: true });
  });
}
