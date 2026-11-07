import { ViewTransition } from "react";
import { RecipeBuilder } from "@/components/foods/RecipeBuilder";
import { getCurrentUser } from "@/lib/current-user";
import {
  listAllFoods,
  listFavoriteFoods,
  listRecentFoods,
} from "@/lib/foods";

export default async function NewRecipePage() {
  const user = await getCurrentUser();
  const [recents, favorites, allFoods] = await Promise.all([
    listRecentFoods(user.id),
    listFavoriteFoods(user.id),
    listAllFoods(user.id),
  ]);

  return (
    <ViewTransition
      enter={{ "sheet-open": "sheet-slide-up", default: "none" }}
      exit={{ "sheet-close": "sheet-slide-down", default: "none" }}
      default="none"
    >
      <RecipeBuilder
        initialRecents={recents}
        initialFavorites={favorites}
        initialAll={allFoods}
      />
    </ViewTransition>
  );
}
