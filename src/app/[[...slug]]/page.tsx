import { WebApp } from "@/components/web/WebApp";

/**
 * Catch-all host for the shared React client.
 * API, OAuth well-known, MCP, and /consent remain as dedicated Next routes.
 */
export default function SpaHostPage() {
  return <WebApp />;
}
