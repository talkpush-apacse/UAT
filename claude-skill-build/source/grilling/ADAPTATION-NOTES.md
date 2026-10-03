# Adaptation notes: grilling

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/mattpocock/skills
- Upstream commit: d81f3a1
- License: MIT (copyright Matt Pocock). The upstream LICENSE file is included unchanged.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 152 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used).
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Replaced the sentence that dispatches a sub-agent (not available in Claude.ai) with a direct lookup instruction and an explicit rule to label unconfirmed assumptions.

## Not available in Claude.ai

- Sub-agents.

For the unmodified upstream skill, use the upstream repository above.
