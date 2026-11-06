import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomFoodForm } from "@/components/foods/CustomFoodForm";
import { getCurrentUser } from "@/lib/current-user";
import { getCustomFood } from "@/lib/custom-food";
import { foodRecordToFormValues } from "@/lib/custom-food-form";

type EditFoodPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFoodPage({ params }: EditFoodPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const food = await getCustomFood(user.id, id);
  if (!food) notFound();

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-center gap-3">
        <Link
          href="/foods"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="truncate text-lg font-semibold tracking-tight">
          Edit food
        </h1>
      </header>

      <CustomFoodForm mode="edit" initial={foodRecordToFormValues(food)} />
    </div>
  );
}
