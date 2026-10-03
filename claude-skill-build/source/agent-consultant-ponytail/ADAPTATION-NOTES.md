# Adaptation notes: agent-consultant-ponytail

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/DietrichGebert/ponytail
- Upstream commit: bb0bdd7
- License: MIT (copyright DietrichGebert). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `ponytail` to `agent-consultant-ponytail` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 187 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: argument-hint, license.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Replaced the slash-command level switch with asking in chat, and 'ACTIVE EVERY RESPONSE' with 'active once invoked' (upstream enforces this through hooks, which are not available).
4. Removed the `argument-hint` and `license` frontmatter keys.
5. Added a short guard paragraph under Boundaries stating that simplicity never removes security, privacy, authorization, auditability, data-integrity protections, or confirmed client requirements. This is NOT in upstream. It restates upstream's 'When NOT to be lazy' list for sensitive projects.

## Not available in Claude.ai

- Lifecycle hooks, `/ponytail` slash commands, statusline, subagent injection.

For the unmodified upstream skill, use the upstream repository above.
