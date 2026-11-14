/** Headers needed for Capacitor → hosted API (esp. free ngrok interstitials). */
export function apiRequestHeaders(
  baseUrl: string,
  headers?: HeadersInit,
): Headers {
  const out = new Headers(headers);
  if (/ngrok/i.test(baseUrl) && !out.has("ngrok-skip-browser-warning")) {
    out.set("ngrok-skip-browser-warning", "true");
  }
  return out;
}
