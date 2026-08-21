import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";

async function logToolCall(toolName: string, success: boolean, durationMs: number) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("mcp_tool_calls")
      .insert({ tool_name: toolName, success, duration_ms: durationMs });
    if (error) console.error("Failed to log MCP tool call:", error.message);
  } catch (err) {
    // Logging must never break an actual tool call.
    console.error("Failed to log MCP tool call:", err);
  }
}

// Wraps every tool registered on `server` so each invocation is timed and
// logged to mcp_tool_calls, without editing the ~14 individual tool
// definitions spread across discovery.ts/projects.ts/checklist-steps.ts/
// progress-and-reviews.ts. Cast through `never`/`unknown` at the boundary
// because registerTool's generic input/output-schema types can't be
// preserved through a runtime wrapper — the wrapper is a pure passthrough
// at runtime, so this doesn't change what any tool actually does.
export function withToolCallLogging(server: McpServer): McpServer {
  const originalRegisterTool = server.registerTool.bind(server);

  server.registerTool = ((
    name: string,
    config: never,
    cb: (...args: unknown[]) => unknown
  ) => {
    const wrapped = async (...args: unknown[]) => {
      const start = Date.now();
      try {
        const result = await cb(...args);
        await logToolCall(name, true, Date.now() - start);
        return result;
      } catch (err) {
        await logToolCall(name, false, Date.now() - start);
        throw err;
      }
    };
    return originalRegisterTool(name, config, wrapped as never);
  }) as typeof server.registerTool;

  return server;
}
