export type SecureStorageAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export type CameraCapture = {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

export type CameraAdapter = {
  /** Capture a JPEG (getUserMedia, with file-input fallback on web). */
  captureJpeg(): Promise<CameraCapture | null>;
};

export type BarcodeAdapter = {
  /** Return a barcode string, or null if cancelled. */
  scan(): Promise<string | null>;
};

export type AppLifecycleAdapter = {
  /** Subscribe to app/page becoming visible. Returns unsubscribe. */
  subscribe(onVisible: () => void): () => void;
};

export type ExternalLinkAdapter = {
  open(url: string): void;
};

export type PlatformAdapters = {
  storage: SecureStorageAdapter;
  camera: CameraAdapter;
  barcode: BarcodeAdapter;
  lifecycle: AppLifecycleAdapter;
  links: ExternalLinkAdapter;
};
