"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseNutritionLabelAction } from "@/app/foods/actions";
import { OCR_PREFILL_STORAGE_KEY } from "@/lib/custom-food-form";

type LabelCaptureScreenProps = {
  open: boolean;
  onClose: () => void;
  returnTo: string;
};

type CaptureStatus = "starting" | "ready" | "reading" | "error" | "denied";

function frameToJpegBase64(
  video: HTMLVideoElement,
): Promise<{ base64: string; mimeType: string }> {
  const maxSide = 768;
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const scale = Math.min(1, maxSide / Math.max(vw, vh));
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Could not capture photo"));
  ctx.drawImage(video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode photo"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? "");
          const base64 = dataUrl.split(",")[1] ?? "";
          if (!base64) {
            reject(new Error("Could not encode photo"));
            return;
          }
          resolve({ base64, mimeType: "image/jpeg" });
        };
        reader.onerror = () => reject(new Error("Could not encode photo"));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.72,
    );
  });
}

export function LabelCaptureScreen({
  open,
  onClose,
  returnTo,
}: LabelCaptureScreenProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturingRef = useRef(false);

  const [status, setStatus] = useState<CaptureStatus>("starting");
  const [message, setMessage] = useState<string | null>(null);
  const [cameraSession, setCameraSession] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      capturingRef.current = false;
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setMessage(null);

    async function start() {
      try {
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
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          throw new Error("play failed");
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) {
          stopCamera();
          setStatus("denied");
          setMessage(
            "Camera access is required to scan labels. Allow camera permission and try again.",
          );
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, cameraSession, stopCamera]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function capture() {
    const video = videoRef.current;
    if (!video || status !== "ready" || capturingRef.current) return;

    capturingRef.current = true;
    setStatus("reading");
    setMessage(null);

    try {
      const { base64, mimeType } = await frameToJpegBase64(video);
      stopCamera();

      const result = await parseNutritionLabelAction({
        imageBase64: base64,
        mimeType,
      });

      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        capturingRef.current = false;
        return;
      }

      sessionStorage.setItem(
        OCR_PREFILL_STORAGE_KEY,
        JSON.stringify(result.values),
      );
      onClose();
      router.push(`/foods/new?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (err) {
      stopCamera();
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Failed to read nutrition label",
      );
      capturingRef.current = false;
    }
  }

  if (!open) return null;

  const hint =
    status === "reading"
      ? "Reading label…"
      : status === "denied" || status === "error"
        ? message
        : status === "starting"
          ? "Starting camera…"
          : "Center the nutrition card in the frame";

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-capture-title"
    >
      <div className="relative flex h-dvh w-full max-w-[var(--app-max-width)] flex-col">
        <header className="relative z-20 flex items-center gap-2 border-b border-white/10 bg-bg-elevated px-3 py-3">
          <button
            type="button"
            onClick={() => {
              capturingRef.current = false;
              stopCamera();
              onClose();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-text-muted hover:bg-surface-hover"
            aria-label="Close"
          >
            ✕
          </button>
          <h2
            id="label-capture-title"
            className="flex-1 text-center text-base font-semibold text-text"
          >
            Scan Label
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
            <div className="aspect-[3/4] w-full max-w-[16rem] rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
        </div>

        <footer
          className="relative z-20 flex flex-col items-center gap-3 border-t border-border bg-bg-elevated px-4 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {status === "error" ? (
            <button
              type="button"
              onClick={() => {
                capturingRef.current = false;
                setMessage(null);
                setCameraSession((n) => n + 1);
              }}
              className="text-sm font-medium text-accent"
            >
              Retake
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void capture()}
            disabled={status !== "ready"}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-text bg-accent disabled:opacity-40"
            aria-label="Capture photo"
          >
            <span className="h-12 w-12 rounded-full bg-accent" />
          </button>
        </footer>
      </div>
    </div>
  );
}
