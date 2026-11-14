import { signInPasswordSchema } from "@food-tracker/contracts";
import { withCors } from "@/lib/api/cors";
import { jsonErr, jsonOk, readJsonBody } from "@/lib/api/http";
import { signInWithPassword } from "@/lib/api/native-tokens";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request, signInPasswordSchema);
  if (!parsed.ok) return withCors(request, parsed.response);

  const result = await signInWithPassword(
    parsed.data.email,
    parsed.data.password,
  );
  if (!result.ok) {
    return withCors(request, jsonErr(result.error, 401));
  }
  return withCors(request, jsonOk(result.data));
}
