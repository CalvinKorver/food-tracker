import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export function SignInPage() {
  const { user, loading, signInWithEmail } = useAuth();
  const location = useLocation();
  const nextParam = new URLSearchParams(location.search).get("next");
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const from =
    nextParam && nextParam.startsWith("/")
      ? nextParam
      : stateFrom && stateFrom.startsWith("/")
        ? stateFrom
        : "/diary/today";

  const [email, setEmail] = useState("calvin@foodtracker.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (loading) {
    return <p className="pt-8 text-sm text-text-muted">Loading…</p>;
  }
  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hungry</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to continue.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-[17px] text-text outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-3 text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
