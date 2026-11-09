"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ConsentForm({
  clientName,
  scopes,
}: {
  clientName: string;
  scopes: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

  async function decide(accept: boolean) {
    setBusy(accept ? "approve" : "deny");
    setError(null);
    const oauth_query =
      typeof window !== "undefined"
        ? window.location.search.replace(/^\?/, "")
        : undefined;
    const { data, error: err } = await authClient.$fetch<{
      redirect?: boolean;
      url?: string;
      redirect_uri?: string;
    }>("/oauth2/consent", {
      method: "POST",
      body: {
        accept,
        scope: accept ? scopes.join(" ") : undefined,
        oauth_query,
      },
    });
    if (err) {
      setError(
        (err as { message?: string; error_description?: string })
          .error_description ??
          (err as { message?: string }).message ??
          "Consent failed",
      );
      setBusy(null);
      return;
    }
    const target = data?.url ?? data?.redirect_uri;
    if (target) {
      window.location.href = target;
      return;
    }
    setError("No redirect returned from consent");
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[17px] text-text">
        <span className="font-semibold">{clientName}</span> wants access to your
        food tracker data.
      </p>
      {scopes.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
          {scopes.map((scope) => (
            <li key={scope}>{scope}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void decide(true)}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void decide(false)}
          className="flex-1 rounded-xl bg-surface px-4 py-3 text-[17px] font-semibold text-text disabled:opacity-60"
        >
          {busy === "deny" ? "Denying…" : "Deny"}
        </button>
      </div>
    </div>
  );
}
