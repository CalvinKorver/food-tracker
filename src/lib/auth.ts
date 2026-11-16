import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { prisma } from "@/lib/db";

function authBaseURL() {
  const url = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("BETTER_AUTH_URL is not set");
  }
  return url.replace(/\/$/, "");
}

export function mcpResourceURL() {
  return `${authBaseURL()}/api/mcp`;
}

export function apiV1ResourceURL() {
  return `${authBaseURL()}/api/v1`;
}

/** Fixed public OAuth client for the Capacitor iOS app (PKCE). */
export const IOS_OAUTH_CLIENT_ID = "foodtracker-ios";

export const IOS_OAUTH_REDIRECT_URI = "foodtracker://oauth/callback";

export const API_V1_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "api:read",
  "api:write",
] as const;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Object form so localhost + ngrok hosts both resolve (tunnel Origin ≠ BETTER_AUTH_URL).
  baseURL: {
    allowedHosts: [
      "localhost:*",
      "*.ngrok-free.app",
      "*.ngrok.app",
      "*.ngrok-free.dev",
      new URL(authBaseURL()).host,
    ],
    protocol: "auto",
    fallback: authBaseURL(),
  },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    authBaseURL(),
    "http://localhost:*",
    "https://*.ngrok-free.app",
    "https://*.ngrok.app",
    "https://*.ngrok-free.dev",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
    ...(process.env.CAPACITOR_ORIGINS ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ],
  disabledPaths: ["/token"],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    async sendResetPassword({ user, url }) {
      // Wire to a real mailer in production. Logged for local/dev and App Review docs.
      console.info(
        `[auth] password reset for ${user.email}: ${url}`,
      );
    },
  },
  user: {
    modelName: "user",
    fields: {
      name: "displayName",
    },
    additionalFields: {
      timezone: {
        type: "string",
        required: false,
        defaultValue: "America/Los_Angeles",
        input: true,
      },
      calorieGoal: {
        type: "number",
        required: false,
        input: true,
      },
      proteinGoalG: {
        type: "number",
        required: false,
        input: true,
      },
      carbsGoalG: {
        type: "number",
        required: false,
        input: true,
      },
      fatGoalG: {
        type: "number",
        required: false,
        input: true,
      },
    },
  },
  advanced: {
    trustedProxyHeaders: true,
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResourceURL(),
      resources: [
        {
          identifier: mcpResourceURL(),
          name: "Hungry MCP",
          allowedScopes: [
            "openid",
            "profile",
            "offline_access",
            "mcp:read",
            "mcp:tools",
          ],
        },
        {
          identifier: apiV1ResourceURL(),
          name: "Hungry API",
          allowedScopes: [...API_V1_SCOPES],
        },
      ],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
