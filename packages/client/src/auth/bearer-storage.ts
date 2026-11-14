import type { SecureStorageAdapter } from "../platform";
import {
  clearAccessTokenMemory,
  rememberAccessToken,
} from "./token-memory";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./tokens";

export type StoredBearerTokens = {
  accessToken: string;
  refreshToken?: string;
};

export async function persistBearerTokens(
  storage: SecureStorageAdapter,
  tokens: StoredBearerTokens,
): Promise<void> {
  rememberAccessToken(tokens.accessToken);
  const writes = [storage.set(ACCESS_TOKEN_KEY, tokens.accessToken)];
  if (tokens.refreshToken) {
    writes.push(storage.set(REFRESH_TOKEN_KEY, tokens.refreshToken));
  } else {
    writes.push(storage.remove(REFRESH_TOKEN_KEY));
  }
  await Promise.all(writes);
}

export async function clearBearerTokens(
  storage: SecureStorageAdapter,
): Promise<void> {
  clearAccessTokenMemory();
  await Promise.all([
    storage.remove(ACCESS_TOKEN_KEY),
    storage.remove(REFRESH_TOKEN_KEY),
  ]);
}
