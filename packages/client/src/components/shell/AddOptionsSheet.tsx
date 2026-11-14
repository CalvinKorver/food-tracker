import { useEffect, useState, type ReactNode } from "react";

type AddOptionsSheetProps = {
  open: boolean;
  onClose: () => void;
  onSearchFood: () => void;
  onScanBarcode: () => void;
  onScanLabel: () => void;
};

function Tile({
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
        className="absolute bottom-0 w-full max-w-[var(--app-max-width)] rounded-t-2xl border border-border border-b-0 bg-bg-elevated shadow-2xl transition-transform duration-200"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="px-5 pt-5">
          <h2 id="add-options-title" className="text-lg font-semibold tracking-tight">
            Add to Diary
          </h2>
          <div className="mt-5 flex flex-row gap-2 pb-2">
            <Tile
              label="Search Food"
              color="#ff9f0a"
              background="rgba(255, 159, 10, 0.18)"
              onClick={() => pick(onSearchFood)}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              }
            />
            <Tile
              label="Scan Barcode"
              color="#30d158"
              background="rgba(48, 209, 88, 0.18)"
              onClick={() => pick(onScanBarcode)}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 4h2v16H3zm4 0h1v16H7zm3 0h2v16h-2zm4 0h1v16h-1zm3 0h1v16h-1zm3 0h2v16h-2z" />
                </svg>
              }
            />
            <Tile
              label="Scan Label"
              color="#0a84ff"
              background="rgba(10, 132, 255, 0.18)"
              onClick={() => pick(onScanLabel)}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
