import Link from "next/link";
import { NewCustomFoodClient } from "@/components/foods/NewCustomFoodClient";
import { safeReturnTo } from "@/lib/custom-food-form";

type NewFoodPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function NewFoodPage({ searchParams }: NewFoodPageProps) {
  const { returnTo } = await searchParams;
  const safeReturn = safeReturnTo(returnTo);

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center gap-3">
        <Link
          href={safeReturn}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">New custom food</h1>
      </header>

      <NewCustomFoodClient returnTo={safeReturn} />
    </div>
  );
}
