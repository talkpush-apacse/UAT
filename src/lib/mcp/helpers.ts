import { createAdminClient } from "@/lib/supabase/admin";

// --- Helper ---
export async function getProjectBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) throw new Error(`UAT checklist not found: ${slug}`);
  return data;
}

export function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://uat.talkpush.com")
    .trim()
    .replace(/\/+$/, "");
}

// Only `search`/`fetch` declare an `outputSchema` now (kept for the ChatGPT
// MCP Apps spec). All other tools deliberately omit it: the MCP SDK converts
// Zod schemas to JSON Schema draft-07 with no way to opt into 2020-12, and
// at least one real MCP client (the official SDK's own Client class) rejects
// any outputSchema whose declared dialect isn't 2020-12 — which silently
// broke every tool call's result for that client. Dropping outputSchema
// sidesteps the incompatibility entirely; `content` still carries the same
// JSON as text for every client, and `structuredContent` is included too in
// case a lenient client wants it.
export function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}
