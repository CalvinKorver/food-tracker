export function wouldExceedCalorieGoal(
  dayCalories: number,
  entryCalories: number,
  calorieGoal: number | null | undefined,
): boolean {
  if (calorieGoal == null || !(calorieGoal > 0)) return false;
  if (!Number.isFinite(dayCalories) || !Number.isFinite(entryCalories)) {
    return false;
  }
  return dayCalories + entryCalories > calorieGoal;
}

export type CalorieNagStep = {
  title: string;
  body: string;
  declineLabel: string;
  continueLabel: string;
  /** When true, continue allows the add instead of advancing. */
  allow?: boolean;
  /** Show today's protein progress bar on this step. */
  showProteinBar?: boolean;
  /** Show today's fat progress bar on this step. */
  showFatBar?: boolean;
  /** Put continue on the left (outline) and decline on the right (accent). */
  swapButtons?: boolean;
};

export const CALORIE_NAG_STEPS: CalorieNagStep[] = [
  {
    title: "Excuse me 🤨",
    body: "You sure you want to add that?",
    declineLabel: "Not really",
    continueLabel: "For sure",
  },
  {
    title: "Uhhh...",
    body: "Maybe you should eat something with some protein?",
    declineLabel: "Okay, fine",
    continueLabel: "Naw, I'm good.../",
    showProteinBar: true,
    swapButtons: true,
  },
  {
    title: "Damn",
    body: "So you're not going to take my suggestion?",
    declineLabel: "Fine, I will",
    continueLabel: "Nope",
  },
  {
    title: "😤 Seriously?",
    body: "Bruh - just think of the macros",
    declineLabel: "Okay, fine.",
    continueLabel: "Don't care!",
    allow: true,
    showFatBar: true,
  },
];
