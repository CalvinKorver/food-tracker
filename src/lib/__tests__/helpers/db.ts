import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";

/** Wipe domain tables in FK-safe order. Keeps schema; no seed. */
export async function resetTestDb() {
  await prisma.oauthAccessToken.deleteMany();
  await prisma.oauthRefreshToken.deleteMany();
  await prisma.oauthClientResource.deleteMany();
  await prisma.oauthClient.deleteMany();
  await prisma.oauthResource.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.foodEntry.deleteMany();
  await prisma.food.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(overrides?: {
  email?: string;
  displayName?: string;
  timezone?: string;
}) {
  return prisma.user.create({
    data: {
      email: overrides?.email ?? `test-${crypto.randomUUID()}@foodtracker.local`,
      displayName: overrides?.displayName ?? "Test User",
      timezone: overrides?.timezone ?? "America/Los_Angeles",
    },
  });
}

export async function createTestUserWithPassword(
  password: string,
  overrides?: {
    email?: string;
    displayName?: string;
    timezone?: string;
  },
) {
  const user = await createTestUser(overrides);
  const passwordHash = await hashPassword(password);
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    },
  });
  return user;
}

/** Insert a bearer token the API auth layer will accept. */
export async function createTestAccessToken(userId: string) {
  const clientId = `test-client-${crypto.randomUUID()}`;
  await prisma.oauthClient.create({
    data: {
      id: crypto.randomUUID(),
      clientId,
      userId,
      name: "vitest",
      contacts: [],
      scopes: [],
      redirectUris: [],
      postLogoutRedirectUris: [],
      grantTypes: [],
      responseTypes: [],
    },
  });
  const token = `test-token-${crypto.randomUUID()}`;
  await prisma.oauthAccessToken.create({
    data: {
      id: crypto.randomUUID(),
      token,
      clientId,
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      scopes: [],
      resources: [],
      requestedUserInfoClaims: [],
    },
  });
  return token;
}

export function apiRequest(
  path: string,
  init?: RequestInit & { token?: string },
) {
  const { token, headers: initHeaders, ...rest } = init ?? {};
  const headers = new Headers(initHeaders);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (rest.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Request(`http://localhost:3000${path}`, { ...rest, headers });
}

export { prisma };
