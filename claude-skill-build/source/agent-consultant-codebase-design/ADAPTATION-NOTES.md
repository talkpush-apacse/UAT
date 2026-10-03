# Adaptation notes: agent-consultant-codebase-design

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/mattpocock/skills
- Upstream commit: d81f3a1
- License: MIT (copyright Matt Pocock). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `codebase-design` to `agent-consultant-codebase-design` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 157 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used).
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Added a clarification to the pointer to DESIGN-IT-TWICE.md that the parallel sub-agent pattern is done sequentially here. DESIGN-IT-TWICE.md itself is unchanged and still describes sub-agents.

## Not available in Claude.ai

- Parallel sub-agents (DESIGN-IT-TWICE.md describes them; run the designs sequentially instead).

For the unmodified upstream skill, use the upstream repository above.
