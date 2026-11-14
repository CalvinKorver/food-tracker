import { handleOptions } from "@/lib/api/cors";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}
