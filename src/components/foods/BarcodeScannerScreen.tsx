"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lookupBarcodeAction } from "@/app/diary/actions";
import { getBarcodeDetector } from "@/lib/barcode-detect";
import type { FoodListItem } from "@/lib/food-shared";

type BarcodeScannerScreenProps = {
  open: boolean;
  onClose: () => void;
  onFound: (food: FoodListItem) => void;
};

type ScanStatus = "starting" | "ready" | "looking-up" | "error" | "denied";

export function BarcodeScannerScreen({
  open,
  onClose,
  onFound,
}: BarcodeScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ScanStatus>("starting");
  const [message, setMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const handleCode = useCallback(
    async (code: string) => {
      const now = Date.now();
      const last = lastCodeRef.current;
      if (last && last.code === code && now - last.at < 2000) return;
      lastCodeRef.current = { code, at: now };

      if (!scanningRef.current) return;
      scanningRef.current = false;
      setStatus("looking-up");
      setMessage(null);

      const result = await lookupBarcodeAction(code);
      if (result.ok) {
        stopCamera();
        onFound(result.food);
        return;
      }

      setStatus("error");
      setMessage(result.error);
      scanningRef.current = true;
      setTimeout(() => {
        if (scanningRef.current) setStatus("ready");
      }, 1600);
    },
    [onFound, stopCamera],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setMessage(null);
    lastCodeRef.current = null;
    scanningRef.current = true;

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      try {
        const detector = getBarcodeDetector();

        if (detector) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;
          const track = stream.getVideoTracks()[0] ?? null;
          trackRef.current = track;
          const caps = track?.getCapabilities?.() as
            | { torch?: boolean }
            | undefined;
          setTorchSupported(Boolean(caps?.torch));

          video.srcObject = stream;
          await video.play();
          if (cancelled) return;
          setStatus("ready");

          const tick = async () => {
            if (!scanningRef.current || cancelled) return;
            try {
              if (video.readyState >= 2) {
                const codes = await detector.detect(video);
                const value = codes[0]?.rawValue?.trim();
                if (value) {
                  await handleCode(value);
                }
              }
            } catch {
              // ignore frame errors
            }
            if (scanningRef.current && !cancelled) {
              rafRef.current = requestAnimationFrame(() => {
                void tick();
              });
            }
          };
          rafRef.current = requestAnimationFrame(() => {
            void tick();
          });
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result, _error, ctrl) => {
            if (!zxingControlsRef.current) {
              zxingControlsRef.current = ctrl;
              const stream = video.srcObject;
              if (stream instanceof MediaStream) {
                streamRef.current = stream;
                const track = stream.getVideoTracks()[0] ?? null;
                trackRef.current = track;
                const caps = track?.getCapabilities?.() as
                  | { torch?: boolean }
                  | undefined;
                setTorchSupported(Boolean(caps?.torch));
              }
            }
            if (!result || !scanningRef.current || cancelled) return;
            void handleCode(result.getText());
          },
        );
        zxingControlsRef.current = controls;
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("denied");
          setMessage(
            "Camera access is required to scan barcodes. Allow camera permission and try again.",
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, handleCode, stopCamera]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        // @ts-expect-error torch is a non-standard constraint
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  if (!open) return null;

  const hint =
    status === "looking-up"
      ? "Looking up…"
      : status === "denied"
        ? message
        : status === "error"
          ? message
          : status === "starting"
            ? "Starting camera…"
            : "Place barcode in the frame to scan";

  // Portal so nested sheets (FoodPicker) can't trap this under their stacking context.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex justify-center bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scanner-title"
    >
      <div className="relative flex h-dvh w-full max-w-[var(--app-max-width)] flex-col">
        <header className="relative z-20 flex items-center gap-2 border-b border-white/10 bg-bg-elevated px-3 py-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            ✕
          </button>
          <h2
            id="barcode-scanner-title"
            className="flex-1 text-center text-base font-semibold text-text"
          >
            Scan Barcode
          </h2>
          <span className="w-10" aria-hidden />
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8">
            <p className="relative z-10 mb-4 text-center text-sm font-medium text-white drop-shadow">
              {hint}
            </p>
            <div className="aspect-square w-full max-w-[16rem] rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
        </div>

        <footer
          className="relative z-20 flex items-center justify-center border-t border-border bg-bg-elevated px-4 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => void toggleTorch()}
            disabled={!torchSupported || status === "denied"}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-wide text-text disabled:opacity-40"
            aria-pressed={torchOn}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2v1" />
              <path d="M8.5 7.5 7 6" />
              <path d="M15.5 7.5 17 6" />
              <path d="M7 14a5 5 0 0 1 10 0c0 2-1 3-2 4H9c-1-1-2-2-2-4Z" />
            </svg>
            FLASH
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
