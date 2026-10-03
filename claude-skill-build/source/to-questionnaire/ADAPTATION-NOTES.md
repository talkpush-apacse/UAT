# Adaptation notes: to-questionnaire

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/mattpocock/skills
- Upstream commit: d81f3a1
- License: MIT (copyright Matt Pocock). The upstream LICENSE file is included unchanged.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 88 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: disable-model-invocation.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Replaced 'write to the current directory and report the path' with delivery as a file or in chat, and adjusted the matching 'done' condition.

For the unmodified upstream skill, use the upstream repository above.
