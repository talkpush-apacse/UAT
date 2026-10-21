# Adaptation notes: agent-consultant-to-spec

This is an ADAPTED copy for Claude.ai. It is not the official upstream version.

- Upstream: https://github.com/mattpocock/skills
- Upstream commit: d81f3a1
- License: MIT (copyright Matt Pocock). The upstream LICENSE file is included unchanged.
- Skill name: renamed from upstream `to-spec` to `agent-consultant-to-spec` (folder and frontmatter `name`) to follow the agent-consultant naming standard.

## Changes made

1. Frontmatter reduced to `name` and `description`. Description shortened to 114 characters (Claude.ai help center states a 200 character maximum; platform docs state 1024; the stricter limit was used). Removed frontmatter keys: disable-model-invocation.
2. Added a short Claude.ai adaptation callout under the frontmatter.
3. Removed the dependency on `/setup-matt-pocock-skills` and the issue tracker configuration it creates.
4. Changed 'Explore the repo' to reviewing files the user has shared.
5. Replaced 'publish to the issue tracker and apply the ready-for-agent label' with delivery as a Markdown document.
6. Description rewritten to match (upstream says it publishes to the issue tracker).

## Not available in Claude.ai

- Publishing to an issue tracker; triage labels; `/setup-matt-pocock-skills`.

For the unmodified upstream skill, use the upstream repository above.
