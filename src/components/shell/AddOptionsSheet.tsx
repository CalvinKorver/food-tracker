"use client";

import { useEffect, useState, type ReactNode } from "react";

type AddOptionsSheetProps = {
  open: boolean;
  onClose: () => void;
  onSearchFood: () => void;
  onScanBarcode: () => void;
  onScanLabel: () => void;
};

const iconSvgProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function SearchIcon() {
  return (
    <svg {...iconSvgProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg {...iconSvgProps}>
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

function CameraIcon() {
  return (
    <svg {...iconSvgProps}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function AddOptionTile({
  label,
  icon,
  color,
  background,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  color: string;
  background: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center gap-2.5 rounded-xl p-1 transition active:scale-[0.97]"
    >
      <span
        className="flex h-[4.25rem] w-[4.25rem] max-w-full items-center justify-center rounded-2xl"
        style={{ color, background }}
      >
        {icon}
      </span>
      <span className="text-center text-xs font-medium leading-tight text-text">
        {label}
      </span>
    </button>
  );
}

export function AddOptionsSheet({
  open,
  onClose,
  onSearchFood,
  onScanBarcode,
  onScanLabel,
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

  function pick(action: () => void) {
    action();
    onClose();
  }

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

          <div className="mt-5 flex flex-row gap-2 pb-2">
            <AddOptionTile
              label="Search Food"
              icon={<SearchIcon />}
              color="#ff9f0a"
              background="rgba(255, 159, 10, 0.18)"
              onClick={() => pick(onSearchFood)}
            />
            <AddOptionTile
              label="Scan Barcode"
              icon={<BarcodeIcon />}
              color="#30d158"
              background="rgba(48, 209, 88, 0.18)"
              onClick={() => pick(onScanBarcode)}
            />
            <AddOptionTile
              label="Scan Label"
              icon={<CameraIcon />}
              color="#0a84ff"
              background="rgba(10, 132, 255, 0.18)"
              onClick={() => pick(onScanLabel)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
