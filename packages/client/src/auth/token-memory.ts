/** In-memory bearer token so native requests skip Preferences on every call. */
let memoryToken: string | null | undefined;

export function peekAccessToken(): string | null | undefined {
  return memoryToken;
}

export function rememberAccessToken(token: string | null) {
  memoryToken = token;
}

export function clearAccessTokenMemory() {
  memoryToken = null;
}
