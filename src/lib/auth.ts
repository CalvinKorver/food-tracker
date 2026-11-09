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

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: authBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [authBaseURL()],
  disabledPaths: ["/token"],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
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
          name: "Food Tracker MCP",
          allowedScopes: [
            "openid",
            "profile",
            "offline_access",
            "mcp:read",
            "mcp:tools",
          ],
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
