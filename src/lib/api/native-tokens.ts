import { verifyPassword } from "better-auth/crypto";
import type { ApiResult, NativeTokenPair } from "@food-tracker/contracts";
import {
  API_V1_SCOPES,
  IOS_OAUTH_CLIENT_ID,
  IOS_OAUTH_REDIRECT_URI,
  apiV1ResourceURL,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/api/serializers";
import type { User } from "@/generated/prisma/client";

const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
}

let iosOauthClientReady: Promise<void> | null = null;

/** Idempotent OAuth client/resource bootstrap for foodtracker-ios. */
export async function ensureIosOauthClient(): Promise<void> {
  if (!iosOauthClientReady) {
    iosOauthClientReady = (async () => {
      const resource = apiV1ResourceURL();
      const scopes = [...API_V1_SCOPES];

      await prisma.oauthResource.upsert({
        where: { identifier: resource },
        update: {
          name: "Hungry API",
          allowedScopes: scopes,
          disabled: false,
        },
        create: {
          id: crypto.randomUUID(),
          identifier: resource,
          name: "Hungry API",
          allowedScopes: scopes,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.oauthClient.upsert({
        where: { clientId: IOS_OAUTH_CLIENT_ID },
        update: {
          name: "Hungry iOS",
          redirectUris: [IOS_OAUTH_REDIRECT_URI],
          grantTypes: ["authorization_code", "refresh_token"],
          responseTypes: ["code"],
          tokenEndpointAuthMethod: "none",
          applicationType: "native",
          requirePKCE: true,
          scopes,
          disabled: false,
        },
        create: {
          id: crypto.randomUUID(),
          clientId: IOS_OAUTH_CLIENT_ID,
          name: "Hungry iOS",
          redirectUris: [IOS_OAUTH_REDIRECT_URI],
          grantTypes: ["authorization_code", "refresh_token"],
          responseTypes: ["code"],
          tokenEndpointAuthMethod: "none",
          applicationType: "native",
          requirePKCE: true,
          scopes,
          contacts: [],
          postLogoutRedirectUris: [],
          clientCredentialsScopes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.oauthClientResource.upsert({
        where: {
          clientId_resourceId: {
            clientId: IOS_OAUTH_CLIENT_ID,
            resourceId: resource,
          },
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          clientId: IOS_OAUTH_CLIENT_ID,
          resourceId: resource,
          createdAt: new Date(),
        },
      });
    })().catch((err) => {
      iosOauthClientReady = null;
      throw err;
    });
  }
  await iosOauthClientReady;
}

async function mintTokenPair(user: User): Promise<NativeTokenPair> {
  await ensureIosOauthClient();

  const now = new Date();
  const accessExpires = new Date(now.getTime() + ACCESS_TTL_MS);
  const refreshExpires = new Date(now.getTime() + REFRESH_TTL_MS);
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const sessionToken = randomToken();
  const resource = apiV1ResourceURL();
  const scopes = [...API_V1_SCOPES];

  const session = await prisma.session.create({
    data: {
      id: crypto.randomUUID(),
      token: sessionToken,
      userId: user.id,
      expiresAt: refreshExpires,
      createdAt: now,
      updatedAt: now,
      userAgent: "foodtracker-ios",
    },
  });

  const refresh = await prisma.oauthRefreshToken.create({
    data: {
      id: crypto.randomUUID(),
      token: refreshToken,
      clientId: IOS_OAUTH_CLIENT_ID,
      userId: user.id,
      sessionId: session.id,
      expiresAt: refreshExpires,
      createdAt: now,
      scopes,
      resources: [resource],
      requestedUserInfoClaims: [],
    },
  });

  await prisma.oauthAccessToken.create({
    data: {
      id: crypto.randomUUID(),
      token: accessToken,
      clientId: IOS_OAUTH_CLIENT_ID,
      userId: user.id,
      sessionId: session.id,
      refreshId: refresh.id,
      expiresAt: accessExpires,
      createdAt: now,
      scopes,
      resources: [resource],
      requestedUserInfoClaims: [],
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresAt: accessExpires.toISOString(),
    user: toSessionUser(user),
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<ApiResult<NativeTokenPair>> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, error: "Email and password are required" };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (!user) {
    return { ok: false, error: "Invalid email or password" };
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!account?.password) {
    return { ok: false, error: "Invalid email or password" };
  }

  const valid = await verifyPassword({
    hash: account.password,
    password,
  });
  if (!valid) {
    return { ok: false, error: "Invalid email or password" };
  }

  return { ok: true, data: await mintTokenPair(user) };
}

export async function refreshNativeTokens(
  refreshToken: string,
): Promise<ApiResult<NativeTokenPair>> {
  const trimmed = refreshToken.trim();
  if (!trimmed) {
    return { ok: false, error: "Refresh token is required" };
  }

  const existing = await prisma.oauthRefreshToken.findFirst({
    where: {
      token: trimmed,
      clientId: IOS_OAUTH_CLIENT_ID,
      revoked: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  if (!existing?.user) {
    return { ok: false, error: "Invalid refresh token" };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.oauthRefreshToken.update({
      where: { id: existing.id },
      data: { revoked: now, rotatedAt: now },
    }),
    prisma.oauthAccessToken.updateMany({
      where: { refreshId: existing.id, revoked: null },
      data: { revoked: now },
    }),
  ]);

  return { ok: true, data: await mintTokenPair(existing.user) };
}
