"use client";

import { useEffect, useState } from "react";

type AddOptionsSheetProps = {
  open: boolean;
  onClose: () => void;
  onSearchFood: () => void;
  onScanBarcode: () => void;
};

function SearchIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M7 8v8" />
      <path d="M10 8v8" />
      <path d="M13 8v8" />
      <path d="M16 8v8" />
    </svg>
  );
}

export function AddOptionsSheet({
  open,
  onClose,
  onSearchFood,
  onScanBarcode,
}: AddOptionsSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center" role="presentation">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-options-title"
        className="absolute bottom-0 w-full max-w-[var(--app-max-width)] rounded-t-2xl border border-border border-b-0 bg-bg-elevated shadow-2xl transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="px-5 pt-5">
          <h2
            id="add-options-title"
            className="text-lg font-semibold tracking-tight text-text"
          >
            Add to Diary
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-4 pb-2">
            <button
              type="button"
              onClick={() => {
                onSearchFood();
                onClose();
              }}
              className="flex flex-col items-center gap-2.5 rounded-xl p-1 transition active:scale-[0.97]"
            >
              <span
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl text-[#c47a12]"
                style={{ background: "rgba(245, 166, 35, 0.18)" }}
              >
                <SearchIcon />
              </span>
              <span className="text-sm font-medium text-text">Search Food</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onScanBarcode();
                onClose();
              }}
              className="flex flex-col items-center gap-2.5 rounded-xl p-1 transition active:scale-[0.97]"
              aria-label="Scan barcode"
            >
              <span
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl text-[#2a9d8f]"
                style={{ background: "rgba(46, 196, 182, 0.18)" }}
              >
                <BarcodeIcon />
              </span>
              <span className="text-sm font-medium text-text">Scan Barcode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
