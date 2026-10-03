# Adaptation notes: security-audit

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/cloudflare/security-audit-skill
- Upstream commit: c1c8a8c
- License: MIT (copyright Cloudflare, Inc.). The upstream LICENSE file is included unchanged.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 180 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used).
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Added a 'Claude.ai availability' section after the title: Guidance mode only, Full audit mode unavailable, single-pass findings must be labelled unverified, no execution of target code.
4. All other files (phase guides, attack classes, schema, validators) are unchanged. The `.cjs` validators and the phase guides only apply to Full audit mode.

## Not available in Claude.ai

- Full audit mode (sub-agents, sandboxed execution, run directory, coverage ledger, independent record verification).
- Parallel hunters and verifiers.

For the unmodified upstream skill, use the upstream repository above.
