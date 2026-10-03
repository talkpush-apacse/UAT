# Adaptation notes: agent-consultant-ponytail-review

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/DietrichGebert/ponytail
- Upstream commit: bb0bdd7
- License: MIT (copyright DietrichGebert). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `ponytail-review` to `agent-consultant-ponytail-review` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 187 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used).
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Added the same sensitive-project guard paragraph as `ponytail` under Boundaries (not in upstream). Do not use this review to propose removing security, privacy, authorization, or audit controls.

## Not available in Claude.ai

- `/ponytail-review` slash command.

For the unmodified upstream skill, use the upstream repository above.
