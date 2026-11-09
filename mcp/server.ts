import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import {
  DEFAULT_USER_EMAIL,
  getUserByEmail,
} from "../src/lib/current-user";
import { prisma } from "../src/lib/db";
import { registerFoodTrackerTools } from "../src/lib/mcp/register-tools";

async function main() {
  const email = process.env.FOODTRACKER_USER_EMAIL ?? DEFAULT_USER_EMAIL;
  const user = await getUserByEmail(email);

  const server = new McpServer({
    name: "food-tracker",
    version: "0.1.0",
  });
  registerFoodTrackerTools(server, async () => user.id);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `food-tracker MCP server running on stdio as ${email} (${user.id})`,
  );
}

async function shutdown() {
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

main().catch(async (err) => {
  console.error(err);
  await shutdown();
  process.exit(1);
});
