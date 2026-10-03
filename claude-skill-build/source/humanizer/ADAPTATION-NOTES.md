# Adaptation notes: humanizer

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/blader/humanizer
- Upstream commit: 225a6f3
- License: MIT (copyright Siqi Chen). The upstream LICENSE file is included unchanged.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 175 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: license, metadata.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Added a scope guard under the title that excludes approved legal, privacy, consent, whistleblower, compliance, and retention text (not in upstream; added for the Employee Hotline project).
4. Only SKILL.md and LICENSE are included. The upstream `agents/openai.yaml` and `scripts/validate-package.py` are not part of the skill's behavior and were left out.

For the unmodified upstream skill, use the upstream repository above.
