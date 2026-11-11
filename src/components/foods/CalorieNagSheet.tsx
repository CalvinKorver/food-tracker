"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { CALORIE_NAG_STEPS } from "@/lib/calorie-nag";
import { goalPercent } from "@/lib/goals";
import { formatNutrient } from "@/lib/nutrients";
import { useDimmedThemeColor } from "@/lib/use-dimmed-theme-color";

type CalorieNagSheetProps = {
  dayProteinG: number;
  dayFatG: number;
  proteinGoalG: number | null;
  fatGoalG: number | null;
  onAllow: () => Promise<void>;
  onDecline: () => void;
};

const SPRING = { type: "spring" as const, stiffness: 380, damping: 22 };

export function CalorieNagSheet({
  dayProteinG,
  dayFatG,
  proteinGoalG,
  fatGoalG,
  onAllow,
  onDecline,
}: CalorieNagSheetProps) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  const current = CALORIE_NAG_STEPS[step] ?? CALORIE_NAG_STEPS.at(-1)!;
  const fromTop = step % 2 === 0;

  useEffect(() => {
    setReady(true);
  }, []);
  useDimmedThemeColor(ready);

  const hasProteinGoal = proteinGoalG != null && proteinGoalG > 0;
  const proteinPercent = goalPercent(dayProteinG, proteinGoalG);
  const hasFatGoal = fatGoalG != null && fatGoalG > 0;
  const fatPercent = goalPercent(dayFatG, fatGoalG);

  function sayYes() {
    if (current.allow) {
      startTransition(async () => {
        await onAllow();
      });
      return;
    }
    setStep((s) => Math.min(s + 1, CALORIE_NAG_STEPS.length - 1));
  }

  const panelInitial = reduceMotion
    ? { opacity: 0, y: 0, rotate: 0, scale: 1 }
    : {
        opacity: 0,
        y: fromTop ? "-120%" : "120%",
        rotate: fromTop ? -4 : 4,
        scale: 0.92,
      };

  if (!ready) return null;

  // Portal out of transformed ancestors (servings slide) so fixed covers the
  // real viewport including under the iOS status bar.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calorie-nag-title"
    >
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        aria-hidden
      />

      <motion.div
        key={step}
        className="relative flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-bg px-5 pt-6 pb-5 shadow-2xl"
        initial={panelInitial}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : SPRING}
      >
        <div className="flex flex-col gap-2">
          <h2
            id="calorie-nag-title"
            className="text-xl font-semibold tracking-tight text-text"
          >
            {current.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-text-muted">
            {current.body}
          </p>
        </div>

        {current.showProteinBar && hasProteinGoal ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <p className="min-w-0">
                <span className="font-semibold text-text">Protein</span>
                <span className="text-text-muted">
                  {" "}
                  – {formatNutrient(dayProteinG)} /{" "}
                  {formatNutrient(proteinGoalG)} g
                </span>
              </p>
              <span className="shrink-0 tabular-nums text-text-muted">
                {proteinPercent}%
              </span>
            </div>
            <progress
              className="nutrient-progress nutrient-progress--protein"
              value={dayProteinG}
              max={proteinGoalG}
              aria-label={`Protein ${proteinPercent}%`}
            />
          </div>
        ) : null}

        {current.showFatBar && hasFatGoal ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <p className="min-w-0">
                <span className="font-semibold text-text">Fat</span>
                <span className="text-text-muted">
                  {" "}
                  – {formatNutrient(dayFatG)} / {formatNutrient(fatGoalG)} g
                </span>
              </p>
              <span className="shrink-0 tabular-nums text-text-muted">
                {fatPercent}%
              </span>
            </div>
            <progress
              className="nutrient-progress nutrient-progress--fat"
              value={dayFatG}
              max={fatGoalG}
              aria-label={`Fat ${fatPercent}%`}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {(() => {
            const declineBtn = (
              <motion.button
                key="decline"
                type="button"
                disabled={pending}
                onClick={onDecline}
                className="rounded-2xl border border-border bg-surface px-3 py-3.5 text-center text-sm font-medium text-text transition hover:bg-surface-hover disabled:opacity-50"
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                {current.declineLabel}
              </motion.button>
            );
            const continueBtn = (
              <motion.button
                key="continue"
                type="button"
                disabled={pending}
                onClick={sayYes}
                className="rounded-2xl bg-accent px-3 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                {pending && current.allow ? "Logging…" : current.continueLabel}
              </motion.button>
            );
            return current.swapButtons ? (
              <>
                {continueBtn}
                {declineBtn}
              </>
            ) : (
              <>
                {declineBtn}
                {continueBtn}
              </>
            );
          })()}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
