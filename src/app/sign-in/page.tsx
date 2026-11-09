import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SignInForm } from "@/components/auth/SignInForm";
import { auth } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/diary/today";

  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Food Tracker</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to continue.</p>
      </div>
      <SignInForm nextPath={nextPath} />
    </div>
  );
}
