import type {
  AppLifecycleAdapter,
  BarcodeAdapter,
  CameraAdapter,
  CameraCapture,
  ExternalLinkAdapter,
  SecureStorageAdapter,
} from "./types";

export const webSecureStorage: SecureStorageAdapter = {
  async get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
  },
  async remove(key) {
    window.localStorage.removeItem(key);
  },
};

function canvasToJpegBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function pickImageFile(): Promise<CameraCapture | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/*";
    input.capture = "environment";
    input.style.display = "none";
    const cleanup = () => {
      input.remove();
    };
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const comma = result.indexOf(",");
        const imageBase64 = comma >= 0 ? result.slice(comma + 1) : result;
        const mimeType: CameraCapture["mimeType"] = file.type.includes("png")
          ? "image/png"
          : file.type.includes("webp")
            ? "image/webp"
            : "image/jpeg";
        cleanup();
        resolve({ imageBase64, mimeType });
      };
      reader.onerror = () => {
        cleanup();
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  });
}

function captureFromStream(stream: MediaStream): Promise<CameraCapture | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;background:#000;color:#fff;";
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    video.style.cssText = "flex:1;width:100%;object-fit:cover;";
    const bar = document.createElement("div");
    bar.style.cssText =
      "display:flex;gap:12px;justify-content:center;padding:16px calc(16px + env(safe-area-inset-bottom));";
    const captureBtn = document.createElement("button");
    captureBtn.type = "button";
    captureBtn.textContent = "Capture";
    captureBtn.style.cssText =
      "flex:1;max-width:12rem;border:0;border-radius:12px;padding:12px;font:600 16px system-ui;background:#0a84ff;color:#fff;";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "flex:1;max-width:8rem;border:0;border-radius:12px;padding:12px;font:600 16px system-ui;background:#2c2c2e;color:#fff;";
    bar.append(cancelBtn, captureBtn);
    overlay.append(video, bar);
    document.body.appendChild(overlay);

    const stop = () => {
      stream.getTracks().forEach((t) => t.stop());
      overlay.remove();
    };

    cancelBtn.onclick = () => {
      stop();
      resolve(null);
    };
    captureBtn.onclick = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        stop();
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvasToJpegBase64(canvas);
      stop();
      resolve({ imageBase64, mimeType: "image/jpeg" });
    };
    void video.play().catch(() => {
      /* still allow capture if metadata arrives */
    });
  });
}

export const webCameraAdapter: CameraAdapter = {
  async captureJpeg() {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        return await captureFromStream(stream);
      } catch {
        // permission denied / no camera — fall through to file input
      }
    }
    return pickImageFile();
  },
};

export const webBarcodeAdapter: BarcodeAdapter = {
  async scan() {
    const code = window.prompt("Enter barcode");
    const trimmed = code?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  },
};

export const webLifecycleAdapter: AppLifecycleAdapter = {
  subscribe(onVisible) {
    const handler = () => {
      if (document.visibilityState === "visible") onVisible();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  },
};

export const webExternalLinkAdapter: ExternalLinkAdapter = {
  open(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  },
};
