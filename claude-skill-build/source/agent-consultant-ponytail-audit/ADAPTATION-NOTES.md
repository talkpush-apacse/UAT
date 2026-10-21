# Adaptation notes: agent-consultant-ponytail-audit

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/DietrichGebert/ponytail
- Upstream commit: bb0bdd7
- License: MIT (copyright DietrichGebert). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `ponytail-audit` to `agent-consultant-ponytail-audit` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 188 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used).
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Added the same sensitive-project guard paragraph under Boundaries (not in upstream).
4. Note: 'scans the entire codebase' only covers files the user shares in Claude.ai.

## Not available in Claude.ai

- `/ponytail-audit` slash command; scanning a repository that has not been shared.

For the unmodified upstream skill, use the upstream repository above.
