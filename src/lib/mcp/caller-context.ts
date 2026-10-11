import { AsyncLocalStorage } from "async_hooks"

// Carries the identity of whoever authenticated the current MCP request (an
// admin's email for an OAuth connector, or "Shared Key" for the static
// MCP_API_KEY) from the auth wrapper in the MCP route down to the tools,
// without threading it through every tool handler.
export const mcpCallerContext = new AsyncLocalStorage<string>()

export const SHARED_KEY_CALLER = "Shared Key"
export const UNKNOWN_ADMIN_CALLER = "OAuth (unknown admin)"

/**
 * The author label to record on a change made through the MCP, e.g.
 * "jolo.yu@talkpush.com (via MCP)". Falls back to "Unknown caller" if a tool
 * is ever run outside an authenticated MCP request.
 */
export function getMcpAuthorLabel(): string {
  const caller = mcpCallerContext.getStore()
  if (!caller) return "Unknown caller (via MCP)"
  if (caller === SHARED_KEY_CALLER) return "Shared key (via MCP)"
  if (caller === UNKNOWN_ADMIN_CALLER) return "Unknown admin (via MCP)"
  return `${caller} (via MCP)`
}
