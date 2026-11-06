/** Browser BarcodeDetector (Chrome / Safari 18+) when available. */

export type BarcodeDetectResult = { rawValue: string };

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectResult[]>;
};

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] as const;

export function getBarcodeDetector(): BarcodeDetectorLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (
    window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: [...FORMATS] });
  } catch {
    return null;
  }
}
