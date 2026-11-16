import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { useDimmedThemeColor } from "../../hooks/useDimmedThemeColor";

type CalorieNagConcedeModalProps = {
  onDismiss: () => void;
};

const SPRING = { type: "spring" as const, stiffness: 380, damping: 22 };

export function CalorieNagConcedeModal({
  onDismiss,
}: CalorieNagConcedeModalProps) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);
  useDimmedThemeColor(ready);

  if (!ready) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nag-concede-title"
    >
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onDismiss}
        aria-hidden
      />

      <motion.div
        className="relative flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-bg px-5 pt-6 pb-5 shadow-2xl"
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: "40%", scale: 0.94 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : SPRING}
      >
        <div className="flex flex-col gap-2">
          <h2
            id="nag-concede-title"
            className="text-xl font-semibold tracking-tight text-text"
          >
            Alright, fine.
          </h2>
          <p className="text-[15px] leading-relaxed text-text-muted">
            Hope you make better choices next time.
          </p>
        </div>

        <motion.button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-2xl bg-accent-teal px-3 py-3.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        >
          Okay bye ✌️
        </motion.button>
      </motion.div>
    </div>,
    document.body,
  );
}
