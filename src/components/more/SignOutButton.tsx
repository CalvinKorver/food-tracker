"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
      className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3.5 text-left text-[17px] text-danger transition hover:bg-surface-hover disabled:opacity-60"
    >
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
