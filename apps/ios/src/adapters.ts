import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  Camera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import { Preferences } from "@capacitor/preferences";
import {
  BarcodeFormat,
  BarcodeScanner,
} from "@capacitor-mlkit/barcode-scanning";
import type { PlatformAdapters } from "@food-tracker/client";

/**
 * Token / PKCE storage via `@capacitor/preferences`.
 *
 * Preferences is UserDefaults on iOS (not encrypted). That is acceptable for
 * v1, but production should migrate to a Keychain plugin
 * (e.g. `@capacitor/secure-storage` / community Keychain) before storing
 * long-lived refresh tokens at scale.
 */
export const iosSecureStorage: PlatformAdapters["storage"] = {
  async get(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
  async remove(key) {
    await Preferences.remove({ key });
  },
};

export const iosCameraAdapter: PlatformAdapters["camera"] = {
  async captureJpeg() {
    try {
      const permission = await Camera.requestPermissions({
        permissions: ["camera"],
      });
      if (permission.camera !== "granted" && permission.camera !== "limited") {
        return null;
      }
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1600,
        correctOrientation: true,
      });
      if (!photo.base64String) return null;
      return { imageBase64: photo.base64String, mimeType: "image/jpeg" };
    } catch {
      return null;
    }
  },
};

async function promptForBarcode(): Promise<string | null> {
  const code = window.prompt("Enter barcode");
  const trimmed = code?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Native barcode scan via ML Kit. If the scanner is unsupported, permission
 * is denied, or the user cancels, fall back to a typed barcode.
 */
export const iosBarcodeAdapter: PlatformAdapters["barcode"] = {
  async scan() {
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (supported) {
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera === "granted") {
          const { barcodes } = await BarcodeScanner.scan({
            formats: [
              BarcodeFormat.Ean13,
              BarcodeFormat.Ean8,
              BarcodeFormat.UpcA,
              BarcodeFormat.UpcE,
              BarcodeFormat.Code128,
              BarcodeFormat.QrCode,
            ],
          });
          const raw = barcodes[0]?.rawValue?.trim();
          if (raw) return raw;
        }
      }
    } catch {
      // cancelled, unsupported, or plugin unavailable
    }
    return promptForBarcode();
  },
};

export const iosLifecycleAdapter: PlatformAdapters["lifecycle"] = {
  subscribe(onVisible) {
    const handlePromise = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) onVisible();
    });
    return () => {
      void handlePromise.then((handle) => handle.remove());
    };
  },
};

export const iosExternalLinkAdapter: PlatformAdapters["links"] = {
  open(url) {
    void Browser.open({ url });
  },
};

export const iosPlatformAdapters: PlatformAdapters = {
  storage: iosSecureStorage,
  camera: iosCameraAdapter,
  barcode: iosBarcodeAdapter,
  lifecycle: iosLifecycleAdapter,
  links: iosExternalLinkAdapter,
};
