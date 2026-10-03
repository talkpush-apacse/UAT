# Adaptation notes: agent-consultant-grill-with-docs

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/mattpocock/skills
- Upstream commit: d81f3a1
- License: MIT (copyright Matt Pocock). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `grill-with-docs` to `agent-consultant-grill-with-docs` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 106 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: disable-model-invocation.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Replaced the instruction to call a Skill tool twice (a Claude Code mechanism) with an instruction to apply both skills, plus a fallback if one is not installed. Fallback wording is new and not from upstream; it restates the ADR test from `domain-modeling`.

## Not available in Claude.ai

- Skill tool invocation.

For the unmodified upstream skill, use the upstream repository above.
