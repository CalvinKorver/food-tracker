import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { ConsentForm } from "@/components/auth/ConsentForm";
import { auth } from "@/lib/auth";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    redirect("/sign-in?next=/consent");
  }

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }

  const signed = new Set(["sig", "ba_param", ...params.getAll("ba_param")]);
  const query = new URLSearchParams(
    [...params].filter(([key]) => signed.has(key)),
  ).toString();
  const { secret } = await auth.$context;
  const valid = query ? await verifyOAuthQueryParams(query, secret) : false;

  if (!valid) {
    return (
      <div className="flex flex-col gap-4 pt-8">
        <h1 className="text-lg font-semibold">Invalid consent request</h1>
        <p className="text-sm text-text-muted">
          This authorization request is missing or expired. Start again from
          Claude, ChatGPT, or Gemini.
        </p>
      </div>
    );
  }

  const clientId = params.get("client_id") ?? "MCP client";
  const scopes = (params.get("scope") ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="text-lg font-semibold tracking-tight">Authorize access</h1>
      <ConsentForm clientName={clientId} scopes={scopes} />
    </div>
  );
}
