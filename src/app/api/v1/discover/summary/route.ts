import { withApiUser } from "@/lib/api/cors";
import { jsonOk } from "@/lib/api/http";
import { getOrCreateDiscoverSummary } from "@/lib/discover-summary";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async (user) => {
    const summary = await getOrCreateDiscoverSummary({ user });
    return jsonOk(summary);
  });
}
