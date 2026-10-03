# Adaptation notes: agent-consultant-diagram-design

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/cathrynlavery/diagram-design
- Upstream commit: f903933
- License: MIT (copyright Cathryn Lavery). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `diagram-design` to `agent-consultant-diagram-design` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 174 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: license, metadata.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Added a 'Claude.ai availability' section after the title listing what works and what is skipped. All reference files, templates, example assets, and scripts are unchanged, so some reference files still mention the unavailable commands and profile paths; the new section tells Claude to skip those.
4. Included THIRD_PARTY_LICENSES.md alongside LICENSE.
5. Known unresolved references (same as upstream's installed skill): reference files mention repository-only maintainer scripts (`scripts/verify-*.py`, `scripts/lint-skin.py`, test fixtures) and logo assets listed in THIRD_PARTY_LICENSES.md. These are not in the skill folder. The availability section tells Claude to skip a check if its file is missing.

## Not available in Claude.ai

- Plugin slash commands; saved brand profiles and project markers; PNG export without Playwright.

For the unmodified upstream skill, use the upstream repository above.
