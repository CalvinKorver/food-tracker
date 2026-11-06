"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const PARK_X = -72;
const OPEN_EVENT = "swipe-to-delete-open";

type SwipeToDeleteRowProps = {
  children: ReactNode;
  onDelete: () => Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * Pointer-based swipe-to-delete (no Motion). Motion's drag attrs were
 * rewritten by Safari before hydrate and caused attribute mismatches.
 */
export function SwipeToDeleteRow({
  children,
  onDelete,
  disabled = false,
  className = "",
}: SwipeToDeleteRowProps) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const lockedRef = useRef<"x" | "y" | null>(null);
  const deletingRef = useRef(false);
  const [parked, setParked] = useState(false);
  const [pending, startTransition] = useTransition();

  const setX = useCallback((next: number, animate: boolean) => {
    xRef.current = next;
    const el = foregroundRef.current;
    if (!el) return;
    el.style.transition = animate
      ? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)"
      : "none";
    el.style.transform = `translate3d(${next}px,0,0)`;
  }, []);

  const snapTo = useCallback(
    (target: number) => {
      setX(target, true);
      setParked(target === PARK_X);
    },
    [setX],
  );

  const close = useCallback(() => {
    snapTo(0);
  }, [snapTo]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== id) snapTo(0);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id, snapTo]);

  useEffect(() => {
    if (!parked) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [parked, close]);

  const commitDelete = useCallback(() => {
    if (disabled || deletingRef.current || pending) return;
    deletingRef.current = true;
    const width = containerRef.current?.offsetWidth ?? 300;
    setX(-width, true);
    startTransition(async () => {
      try {
        await onDelete();
      } catch {
        deletingRef.current = false;
        snapTo(0);
      }
    });
  }, [disabled, onDelete, pending, setX, snapTo]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || pending || deletingRef.current) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    draggingRef.current = true;
    lockedRef.current = null;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    foregroundRef.current?.setPointerCapture(event.pointerId);
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;

    if (!lockedRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockedRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (lockedRef.current === "y") {
        draggingRef.current = false;
        return;
      }
    }
    if (lockedRef.current !== "x") return;

    event.preventDefault();
    const width = containerRef.current?.offsetWidth ?? 300;
    const next = Math.min(0, Math.max(-width, dx));
    setX(next, false);
  };

  const onPointerUp = () => {
    if (!draggingRef.current && lockedRef.current !== "x") {
      lockedRef.current = null;
      return;
    }
    draggingRef.current = false;
    lockedRef.current = null;

    if (disabled || deletingRef.current) return;

    const width = containerRef.current?.offsetWidth ?? 300;
    const current = xRef.current;

    if (current <= -width * 0.55) {
      commitDelete();
      return;
    }
    snapTo(current <= PARK_X * 0.45 ? PARK_X : 0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 flex items-center justify-end bg-danger px-5"
        aria-hidden="true"
      >
        <button
          type="button"
          tabIndex={parked ? 0 : -1}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white"
          aria-label="Delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commitDelete();
          }}
        >
          <TrashIcon />
        </button>
      </div>

      <div
        ref={foregroundRef}
        className="relative z-[1] bg-surface touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
