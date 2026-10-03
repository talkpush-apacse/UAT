# Adaptation notes: agent-consultant-to-tickets

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/mattpocock/skills
- Upstream commit: d81f3a1
- License: MIT (copyright Matt Pocock). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `to-tickets` to `agent-consultant-to-tickets` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 134 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: disable-model-invocation.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Replaced step 5 ('Publish the tickets to the configured tracker', which depended on `/setup-matt-pocock-skills`, local `.scratch` files, or a real tracker) with delivery as Markdown tickets in dependency order. The per-ticket templates are unchanged.
4. Removed the dependency on `/setup-matt-pocock-skills` and changed argument-based fetching and codebase exploration to use only what the user shares.
5. Description rewritten to match.

## Not available in Claude.ai

- Publishing to an issue tracker; native blocking links; `/setup-matt-pocock-skills`.

For the unmodified upstream skill, use the upstream repository above.
