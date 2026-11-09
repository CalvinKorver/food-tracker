import { AsyncLocalStorage } from "node:async_hooks";
import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { auth, mcpResourceURL } from "@/lib/auth";
import { registerFoodTrackerTools } from "@/lib/mcp/register-tools";

const resource = mcpResourceURL();
const userIdStore = new AsyncLocalStorage<string>();

const mcpServerHandler = createMcpHandler(
  () => {
    const server = new McpServer({
      name: "food-tracker",
      version: "0.1.0",
    });
    registerFoodTrackerTools(server, async () => {
      const userId = userIdStore.getStore();
      if (!userId) {
        throw new Error("Missing authenticated user");
      }
      return userId;
    });
    return server;
  },
  // Gemini (and many hosts) still speak 2025 Streamable HTTP; reject mode
  // returns HTTP 400 unsupported-protocol-version after a successful OAuth.
  {
    legacy: "stateless",
  },
);

const POST = requireMcpAuth(
  auth,
  async (request, accessTokenClaims) => {
    const sub = accessTokenClaims.sub;
    if (typeof sub !== "string" || !sub) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
      });
    }
    return userIdStore.run(sub, () => mcpServerHandler.fetch(request));
  },
  { resource },
);

export { POST };
