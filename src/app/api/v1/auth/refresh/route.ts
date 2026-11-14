import { refreshTokenSchema } from "@food-tracker/contracts";
import { withCors } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";
import { refreshNativeTokens } from "@/lib/api/native-tokens";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request, refreshTokenSchema);
  if (!parsed.ok) return withCors(request, parsed.response);

  const result = await refreshNativeTokens(parsed.data.refreshToken);
  if (!result.ok) {
    return withCors(request, jsonErr(result.error, 401));
  }
  return withCors(request, jsonOk(result.data));
}
