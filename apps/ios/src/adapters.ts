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

const SCAN_FORMATS = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
  BarcodeFormat.QrCode,
];

const SCANNER_ACTIVE_CLASS = "barcode-scanner-active";
let handoffModal: HTMLElement | null = null;

function dismissHandoffModal(): void {
  handoffModal?.remove();
  handoffModal = null;
}

async function teardownScanner(): Promise<void> {
  document.documentElement.classList.remove(SCANNER_ACTIVE_CLASS);
  try {
    await BarcodeScanner.removeAllListeners();
  } catch {
    // plugin unavailable
  }
  try {
    await BarcodeScanner.stopScan();
  } catch {
    // not scanning
  }
}

/** Custom overlay over startScan(); close → null, manual entry is opt-in. */
function scanWithOverlay(allowCamera: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let cameraRunning = false;
    let session = 0;

    const modal = document.createElement("div");
    modal.className = "barcode-scanner-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Scan barcode");
    modal.innerHTML = `
      <button type="button" class="barcode-scanner-btn barcode-scanner-btn--close" data-action="close" aria-label="Close">✕</button>
      <div class="barcode-scanner-pane barcode-scanner-pane--camera" data-pane="camera">
        <p class="barcode-scanner-hint">Point at a barcode</p>
        <div class="barcode-scanner-viewfinder" aria-hidden="true">
          <span class="barcode-scanner-dim barcode-scanner-dim--top"></span>
          <span class="barcode-scanner-dim barcode-scanner-dim--bottom"></span>
          <span class="barcode-scanner-dim barcode-scanner-dim--left"></span>
          <span class="barcode-scanner-dim barcode-scanner-dim--right"></span>
        </div>
        <button type="button" class="barcode-scanner-btn barcode-scanner-btn--enter" data-action="enter">Enter barcode</button>
      </div>
      <div class="barcode-scanner-pane barcode-scanner-pane--manual" data-pane="manual" hidden>
        <button type="button" class="barcode-scanner-btn barcode-scanner-btn--back" data-action="back"${allowCamera ? "" : " hidden"}>Back to camera</button>
        <form class="barcode-scanner-form">
          <label class="barcode-scanner-label" for="barcode-manual-input">Barcode number</label>
          <input id="barcode-manual-input" class="barcode-scanner-input" type="text" inputmode="numeric" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Enter barcode" />
          <button type="submit" class="barcode-scanner-btn barcode-scanner-btn--submit">Look up</button>
        </form>
      </div>
      <p class="barcode-scanner-handoff-label">Looking up...</p>
    `;
    dismissHandoffModal();
    document.body.append(modal);

    const cameraPane = modal.querySelector<HTMLElement>('[data-pane="camera"]')!;
    const manualPane = modal.querySelector<HTMLElement>('[data-pane="manual"]')!;
    const input = modal.querySelector<HTMLInputElement>("#barcode-manual-input")!;
    const form = modal.querySelector<HTMLFormElement>("form")!;

    const finish = async (value: string | null) => {
      if (settled) return;
      settled = true;
      session += 1;
      modal.inert = true;
      if (value !== null) {
        modal.classList.add("barcode-scanner-modal--handoff");
        handoffModal = modal;
      }
      await teardownScanner();
      if (value === null) modal.remove();
      resolve(value);
    };

    const showManual = async () => {
      session += 1;
      await teardownScanner();
      cameraRunning = false;
      cameraPane.hidden = true;
      manualPane.hidden = false;
      input.focus();
    };

    const startCamera = async () => {
      if (settled || cameraRunning) return;
      const mySession = session;
      document.documentElement.classList.add(SCANNER_ACTIVE_CLASS);
      try {
        await BarcodeScanner.addListener("barcodesScanned", (event) => {
          if (settled) return;
          const raw = event.barcodes[0]?.rawValue?.trim();
          if (!raw) return;
          void finish(raw);
        });
        await BarcodeScanner.startScan({ formats: SCAN_FORMATS });
        if (settled || mySession !== session) {
          await teardownScanner();
          return;
        }
        cameraRunning = true;
      } catch {
        // startScan failed → manual
        cameraRunning = false;
        await teardownScanner();
        if (!settled && mySession === session) await showManual();
      }
    };

    const showCamera = async () => {
      if (!allowCamera || settled) return;
      manualPane.hidden = true;
      cameraPane.hidden = false;
      input.value = "";
      await startCamera();
    };

    modal.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-action]",
      );
      if (!target) return;
      const action = target.dataset.action;
      if (action === "close") void finish(null);
      else if (action === "enter") void showManual();
      else if (action === "back") void showCamera();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const trimmed = input.value.trim();
      void finish(trimmed.length > 0 ? trimmed : null);
    });

    if (allowCamera) void startCamera();
    else void showManual();
  });
}

export const iosBarcodeAdapter: PlatformAdapters["barcode"] = {
  async scan() {
    let allowCamera = false;
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (supported) {
        const permission = await BarcodeScanner.requestPermissions();
        allowCamera = permission.camera === "granted";
      }
    } catch {
      // unsupported / permission / plugin unavailable
    }
    return scanWithOverlay(allowCamera);
  },
  dismiss: dismissHandoffModal,
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
