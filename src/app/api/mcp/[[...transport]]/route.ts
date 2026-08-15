import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerDiscoveryTools } from "@/lib/mcp/tools/discovery";
import { registerProjectTools } from "@/lib/mcp/tools/projects";
import { registerChecklistStepTools } from "@/lib/mcp/tools/checklist-steps";
import { registerProgressTools } from "@/lib/mcp/tools/progress-and-reviews";

// Constant-time comparison — mirrors the pattern in lib/utils/admin-auth.ts.
function isValidApiKey(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// --- MCP Handler ---
const handler = createMcpHandler(
  (server) => {
    registerDiscoveryTools(server);
    registerProjectTools(server);
    registerChecklistStepTools(server);
    registerProgressTools(server);
  },
  {
    capabilities: {},
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  }
);

// --- Auth Middleware Wrapper ---
// Accepts either a static API key (header or query param — used by Claude
// Code / direct integrations) or an OAuth Bearer access token issued by the
// /oauth/authorize + /api/oauth/token flow (used by claude.ai custom
// connectors, which require OAuth and ignore a query-param key).
async function withApiKeyAuth(
  req: Request,
  handlerFn: (req: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken) {
    const { validateAccessToken } = await import("@/lib/oauth/store");
    const expectedResource = `${url.origin}/api/mcp`;
    const valid = await validateAccessToken(bearerToken, expectedResource);
    if (valid) return handlerFn(req);
    return unauthorized(req);
  }

  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    console.error("MCP_API_KEY is not set — rejecting all API-key auth attempts");
    return unauthorized(req);
  }

  if (!isValidApiKey(apiKey, expectedKey)) {
    return unauthorized(req);
  }

  return handlerFn(req);
}

function unauthorized(req: Request): Response {
  const origin = new URL(req.url).origin;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`,
    },
  });
}

// Export route handlers with auth wrapper
export async function GET(req: Request) {
  return withApiKeyAuth(req, handler);
}

export async function POST(req: Request) {
  return withApiKeyAuth(req, handler);
}

export async function DELETE(req: Request) {
  return withApiKeyAuth(req, handler);
}
