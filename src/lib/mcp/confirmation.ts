import { createHmac, timingSafeEqual } from "crypto";

// Two-step confirmation for the MCP notify_testers tool.
//
// The first call (a preview) returns a confirmation code; the email only goes
// out when the second call presents that code. The code is an HMAC over the
// exact checklist, recipients and note that were previewed plus an expiry, so:
//   - the email can't be sent without first previewing it,
//   - changing the recipients or the note invalidates the code,
//   - a code stops working after CODE_TTL_MS.
// It is stateless (nothing stored), so a still-valid code can be presented
// more than once inside its window — callers should not retry a send blindly.

export const CODE_TTL_MS = 10 * 60 * 1000;

export interface NotifyConfirmationInput {
  slug: string;
  testerIds: string[];
  message: string;
}

function secret(): string {
  const value = process.env.SHARE_TOKEN_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("No signing secret configured for confirmation codes");
  return value;
}

function sign(input: NotifyConfirmationInput, expiresAt: number): string {
  const canonical = JSON.stringify({
    purpose: "mcp-notify-testers",
    slug: input.slug,
    testerIds: [...input.testerIds].sort(),
    message: input.message,
    expiresAt,
  });
  return createHmac("sha256", secret()).update(canonical).digest("hex");
}

export function createNotifyConfirmationCode(
  input: NotifyConfirmationInput,
  now: number = Date.now()
): string {
  const expiresAt = now + CODE_TTL_MS;
  return `${expiresAt}.${sign(input, expiresAt)}`;
}

export function verifyNotifyConfirmationCode(
  code: string,
  input: NotifyConfirmationInput,
  now: number = Date.now()
): { valid: true } | { valid: false; reason: "malformed" | "expired" | "mismatch" } {
  const [expiresRaw, signature] = code.split(".");
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt)) return { valid: false, reason: "malformed" };

  const expected = Buffer.from(sign(input, expiresAt));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { valid: false, reason: "mismatch" };
  }
  if (now > expiresAt) return { valid: false, reason: "expired" };
  return { valid: true };
}
