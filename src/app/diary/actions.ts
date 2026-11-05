"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { deleteFoodEntry } from "@/lib/diary";

export async function deleteEntryAction(entryId: string, dateKey: string) {
  const user = await getCurrentUser();
  const deleted = await deleteFoodEntry(user.id, entryId);

  if (!deleted) {
    return { ok: false as const, error: "Entry not found" };
  }

  revalidatePath(`/diary/${dateKey}`);
  revalidatePath("/diary/today");
  return { ok: true as const };
}
