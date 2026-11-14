import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";

export function StatusBanners() {
  const queryClient = useQueryClient();
  const { error: authError } = useAuth();
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const onError = (message: string) => {
      if (/unauthorized/i.test(message)) return;
      setApiError(message);
    };
    const unsubQuery = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.state.status === "error") {
        const err = event.query.state.error;
        onError(err instanceof Error ? err.message : "Request failed");
      }
    });
    const unsubMut = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.mutation.state.status === "error") {
        const err = event.mutation.state.error;
        onError(err instanceof Error ? err.message : "Request failed");
      }
    });
    return () => {
      unsubQuery();
      unsubMut();
    };
  }, [queryClient]);

  const message = offline
    ? "You're offline. Some actions may not work."
    : apiError ?? authError;

  if (!message) return null;

  return (
    <div
      role="status"
      className="mb-3 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger"
    >
      <div className="flex items-start justify-between gap-2">
        <p>{message}</p>
        {apiError ? (
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-danger"
            onClick={() => setApiError(null)}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
