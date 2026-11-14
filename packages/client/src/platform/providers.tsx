import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlatformAdapters } from "./types";
import {
  webBarcodeAdapter,
  webCameraAdapter,
  webExternalLinkAdapter,
  webLifecycleAdapter,
  webSecureStorage,
} from "./web";

const PlatformContext = createContext<PlatformAdapters | null>(null);

export function defaultPlatformAdapters(
  partial?: Partial<PlatformAdapters>,
): PlatformAdapters {
  return {
    storage: partial?.storage ?? webSecureStorage,
    camera: partial?.camera ?? webCameraAdapter,
    barcode: partial?.barcode ?? webBarcodeAdapter,
    lifecycle: partial?.lifecycle ?? webLifecycleAdapter,
    links: partial?.links ?? webExternalLinkAdapter,
  };
}

export function PlatformProviders({
  adapters,
  children,
}: {
  adapters: PlatformAdapters;
  children: ReactNode;
}) {
  const value = useMemo(() => adapters, [adapters]);
  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformAdapters {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error("usePlatform must be used within PlatformProviders");
  }
  return ctx;
}
