import { withApiUser } from "@/lib/api/cors";
import { jsonOk } from "@/lib/api/http";
import { getDiscoverWindowForUser } from "@/lib/discover";

export { OPTIONS } from "@/app/api/v1/_cors";

export async function GET(request: Request) {
  return withApiUser(request, async (user) => {
    const window = await getDiscoverWindowForUser(user);
    return jsonOk(window);
  });
}
