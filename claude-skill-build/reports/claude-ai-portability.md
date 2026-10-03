# Claude.ai portability report

Generated 2026-10-03. Third-party skills are minimally adapted copies, not the official upstream versions. Every change is listed in each skill's ADAPTATION-NOTES.md.

**Not verified:** the ZIPs were validated structurally and discovered by Claude Code in a throwaway project folder. They were NOT uploaded to Claude.ai from this environment, so Claude.ai acceptance is unconfirmed.

**Class key:** A = portable directly (metadata edits and small additions only). B = portable with adaptation (instructions edited). C = Claude Code only (no meaningful Claude.ai version).

**Description limit:** the Claude.ai help center states 200 characters for the description; the platform docs state 1024. The two disagree, so every Claude.ai ZIP uses 200 or fewer. Names are lowercase letters, numbers and hyphens and contain no reserved words.

## Packaged for Claude.ai

| Skill | Repository | License | Class | ZIP | SHA-256 |
|---|---|---|---|---|---|
| employee-hotline-product-lead | Original (this project) | Original, no third-party content | A | dist/employee-hotline-product-lead.zip | `1f34faa4482ae7db6b081df1f7617d51bf22e32d0519ccaf672ca3c9fcdea29d` |
| security-audit | https://github.com/cloudflare/security-audit-skill @ c1c8a8c | MIT (Cloudflare, Inc.) | B | dist/security-audit.zip | `a022fc03082dcc928f3c0c43a1615a9415d5d58f6060455cb984d4709b689848` |
| diagram-design | https://github.com/cathrynlavery/diagram-design @ f903933 | MIT (Cathryn Lavery) plus THIRD_PARTY_LICENSES.md | B | dist/diagram-design.zip | `4bc6de31d0fb762c5477bb15be74d03de04e361953367ef914ea01ea944981d1` |
| humanizer | https://github.com/blader/humanizer @ 225a6f3 | MIT (Siqi Chen) | A | dist/humanizer.zip | `a2025c47dd8e73278a2e9ac6ae7e8d840d9aea0fc8183ea88e1cdf684d765343` |
| ponytail | https://github.com/DietrichGebert/ponytail @ bb0bdd7 | MIT (DietrichGebert) | B | dist/ponytail.zip | `d7b7cd8d6115b2404764beb35c5f79073e9ad0699e7fca8604960fe9927174e0` |
| ponytail-review | https://github.com/DietrichGebert/ponytail @ bb0bdd7 | MIT (DietrichGebert) | A | dist/ponytail-review.zip | `fc0ba4e6f7be2b7927a7c177f02e704442e93df54589a9ce451cc60eaa1cf113` |
| ponytail-audit | https://github.com/DietrichGebert/ponytail @ bb0bdd7 | MIT (DietrichGebert) | B | dist/ponytail-audit.zip | `f7fb88651612df09176b1421a5f9e5d1fa00bf9d45d647866d97067b96e293de` |
| grilling | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | dist/grilling.zip | `43926a3990d9d54b4bbad9172554c6b2cc3572b16e4fe0edc91b0086a553a928` |
| grill-with-docs | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | dist/grill-with-docs.zip | `e896968f6c23c9989350fe7c33c7743b32e5057d1cbe40eb81cf95ef4fefbb53` |
| domain-modeling | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | A | dist/domain-modeling.zip | `16207482bbf9ba639f846a0772941e4ac7f9357934bacf7e044e6ec725409b46` |
| to-questionnaire | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | dist/to-questionnaire.zip | `8beb0816989d7ddc2ebc068e1f4a8134e7ffce6252c379bebd267888eea0f3bf` |
| to-spec | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | dist/to-spec.zip | `d8b8507d882ef44d4bbde3ec99e1d7fc1f2c9b1d01e74f1c6f32cf1cea99e1ae` |
| to-tickets | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | dist/to-tickets.zip | `68c065cfa3d950360a120ff5b1501885f0bc97eed6291af99bd574f1744cdb42` |
| codebase-design | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | dist/codebase-design.zip | `fca4040f04d5059e7fce4df49022d9ea05577b96d51f2ac4b554db5c5a118f84` |

## Per-skill detail

### employee-hotline-product-lead

- Repository: Original (this project)
- License: Original, no third-party content
- Claude Code installation method: Copy ZIP into ~/.claude/skills (script provided)
- Claude Code installation status: Not installed in the cloud container (your decision). ZIP discovered by Claude Code in a throwaway project folder, and a harmless invocation returned the 8 phases correctly.
- Claude.ai compatibility class: A
- Adaptations made: None (original).
- Features unavailable in Claude.ai: None.
- ZIP filename: dist/employee-hotline-product-lead.zip
- SHA-256: `1f34faa4482ae7db6b081df1f7617d51bf22e32d0519ccaf672ca3c9fcdea29d`

### security-audit

- Repository: https://github.com/cloudflare/security-audit-skill @ c1c8a8c
- License: MIT (Cloudflare, Inc.)
- Claude Code installation method: Upstream documents the Skills CLI (`npx skills add`). Plan used a plain copy of the pinned folder instead, so no third-party package runs.
- Claude Code installation status: Not installed in container. Claude Code ZIP discovered in throwaway folder.
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter reduced and description shortened. Added 'Claude.ai availability' section: guidance mode only, full audit mode unavailable, findings must be labelled unverified, no running target code.
- Features unavailable in Claude.ai: Full audit mode: sub-agents, sandboxed execution, run directory, coverage ledger, independent verification.
- ZIP filename: dist/security-audit.zip
- SHA-256: `a022fc03082dcc928f3c0c43a1615a9415d5d58f6060455cb984d4709b689848`

### diagram-design

- Repository: https://github.com/cathrynlavery/diagram-design @ f903933
- License: MIT (Cathryn Lavery) plus THIRD_PARTY_LICENSES.md
- Claude Code installation method: Official plugin: `/plugin marketplace add cathrynlavery/diagram-design` then `/plugin install diagram-design@diagram-design` (no hooks).
- Claude Code installation status: Not installed in container. Plugin commands NOT executed here, so unverified. Run them on your machine.
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter reduced and description shortened. Added 'Claude.ai availability' section. Known unresolved references to repository-only maintainer scripts, same as upstream's installed skill.
- Features unavailable in Claude.ai: Plugin slash commands, saved brand profiles and project markers, PNG export without Playwright.
- ZIP filename: dist/diagram-design.zip
- SHA-256: `4bc6de31d0fb762c5477bb15be74d03de04e361953367ef914ea01ea944981d1`

### humanizer

- Repository: https://github.com/blader/humanizer @ 225a6f3
- License: MIT (Siqi Chen)
- Claude Code installation method: Official plugin: `/plugin marketplace add blader/humanizer` then `/plugin install humanizer@humanizer`.
- Claude Code installation status: Optional, not installed. Plugin commands not executed.
- Claude.ai compatibility class: A
- Adaptations made: Frontmatter reduced (removed license and metadata keys) and description shortened. Added a scope guard excluding legal, privacy, consent, whistleblower, compliance and retention text. Dropped agents/openai.yaml and scripts/validate-package.py.
- Features unavailable in Claude.ai: None of substance.
- ZIP filename: dist/humanizer.zip
- SHA-256: `a2025c47dd8e73278a2e9ac6ae7e8d840d9aea0fc8183ea88e1cdf684d765343`

### ponytail

- Repository: https://github.com/DietrichGebert/ponytail @ bb0bdd7
- License: MIT (DietrichGebert)
- Claude Code installation method: Skill folder copied, hooks deliberately NOT installed (upstream plugin installs 3 hooks).
- Claude Code installation status: Not installed in container. Claude Code ZIP is the unmodified upstream skill.
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter reduced and description shortened. Slash-command levels replaced with asking in chat. 'Active every response' changed to 'active once invoked'. Added a guard under Boundaries that simplicity never removes security, privacy, authorization, auditability, integrity or confirmed client requirements (not in upstream).
- Features unavailable in Claude.ai: Hooks, /ponytail slash commands, statusline, subagent injection.
- ZIP filename: dist/ponytail.zip
- SHA-256: `d7b7cd8d6115b2404764beb35c5f79073e9ad0699e7fca8604960fe9927174e0`

### ponytail-review

- Repository: https://github.com/DietrichGebert/ponytail @ bb0bdd7
- License: MIT (DietrichGebert)
- Claude Code installation method: Skill folder copied, no hooks.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: A
- Adaptations made: Frontmatter and description shortened. Added the same sensitive-project guard under Boundaries.
- Features unavailable in Claude.ai: /ponytail-review slash command.
- ZIP filename: dist/ponytail-review.zip
- SHA-256: `fc0ba4e6f7be2b7927a7c177f02e704442e93df54589a9ce451cc60eaa1cf113`

### ponytail-audit

- Repository: https://github.com/DietrichGebert/ponytail @ bb0bdd7
- License: MIT (DietrichGebert)
- Claude Code installation method: Skill folder copied, no hooks.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter and description shortened. Added the same guard. Note that it can only scan code the user shares.
- Features unavailable in Claude.ai: /ponytail-audit slash command; scanning an unshared repository.
- ZIP filename: dist/ponytail-audit.zip
- SHA-256: `f7fb88651612df09176b1421a5f9e5d1fa00bf9d45d647866d97067b96e293de`

### grilling

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin: `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock` (managed, no hooks, all 27 skills).
- Claude Code installation status: Not installed in container. Plugin commands NOT executed here, so unverified.
- Claude.ai compatibility class: B
- Adaptations made: Replaced the sub-agent lookup sentence with direct lookup or an explicit unconfirmed assumption.
- Features unavailable in Claude.ai: Sub-agents.
- ZIP filename: dist/grilling.zip
- SHA-256: `43926a3990d9d54b4bbad9172554c6b2cc3572b16e4fe0edc91b0086a553a928`

### grill-with-docs

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Via the same plugin.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: B
- Adaptations made: Replaced 'call the Skill tool twice' with an instruction to apply grilling and domain-modeling, with a fallback if either is missing (fallback wording is new). Removed disable-model-invocation.
- Features unavailable in Claude.ai: Skill tool invocation.
- ZIP filename: dist/grill-with-docs.zip
- SHA-256: `e896968f6c23c9989350fe7c33c7743b32e5057d1cbe40eb81cf95ef4fefbb53`

### domain-modeling

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Via the same plugin.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: A
- Adaptations made: Added a note: GLOSSARY.md and ADRs are delivered as documents, not written to a repository.
- Features unavailable in Claude.ai: Writing into a repository.
- ZIP filename: dist/domain-modeling.zip
- SHA-256: `16207482bbf9ba639f846a0772941e4ac7f9357934bacf7e044e6ec725409b46`

### to-questionnaire

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Via the same plugin.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: B
- Adaptations made: Delivery as file or in chat instead of writing to the current directory. Removed disable-model-invocation.
- Features unavailable in Claude.ai: Writing to a working directory.
- ZIP filename: dist/to-questionnaire.zip
- SHA-256: `8beb0816989d7ddc2ebc068e1f4a8134e7ffce6252c379bebd267888eea0f3bf`

### to-spec

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Via the same plugin.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: B
- Adaptations made: Removed dependency on /setup-matt-pocock-skills and the issue tracker. Spec is delivered as a Markdown document. Description rewritten.
- Features unavailable in Claude.ai: Publishing to an issue tracker, triage labels.
- ZIP filename: dist/to-spec.zip
- SHA-256: `d8b8507d882ef44d4bbde3ec99e1d7fc1f2c9b1d01e74f1c6f32cf1cea99e1ae`

### to-tickets

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Via the same plugin.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: B
- Adaptations made: Step 5 replaced: tickets are delivered as Markdown in dependency order. Removed dependency on /setup-matt-pocock-skills. Description rewritten.
- Features unavailable in Claude.ai: Publishing to a tracker, native blocking links.
- ZIP filename: dist/to-tickets.zip
- SHA-256: `68c065cfa3d950360a120ff5b1501885f0bc97eed6291af99bd574f1744cdb42`

### codebase-design

- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Via the same plugin.
- Claude Code installation status: Not installed in container.
- Claude.ai compatibility class: B
- Adaptations made: Clarified that the design-it-twice exercise runs sequentially. DESIGN-IT-TWICE.md unchanged and still describes sub-agents.
- Features unavailable in Claude.ai: Parallel sub-agents.
- ZIP filename: dist/codebase-design.zip
- SHA-256: `fca4040f04d5059e7fce4df49022d9ea05577b96d51f2ac4b554db5c5a118f84`

## Not packaged for Claude.ai

### impeccable (Class C)

- Repository: https://github.com/pbakaus/impeccable @ e103efe. License: Apache-2.0 (NOTICE.md credits ehmo/platform-design-skills, MIT).
- Why not: its SKILL.md requires running a local engine program (`scripts/impeccable context`) at the start of every session, and every command goes through it. The engine downloads a binary from GitHub Releases on first use. Without it the skill is not meaningful.
- Claude Code: unmodified upstream skill folder, hooks NOT installed. ZIP: dist/claude-code/impeccable.zip, SHA-256 `f721f649fce0fc3858252475fede1b5766d6f74a0ad4b74fa8206e4d41322aa7`. First use will try to download the engine into `~/.impeccable/bin/`; the launcher checks it against a checksum file from the same release page.
- Claude.ai alternative: your existing `agent-consultant-ux-*` and `product-design-frontend-ux` skills, plus the UX principles in `employee-hotline-product-lead`.

### graphify (Class C)

- Repository: https://github.com/Graphify-Labs/graphify @ 0b60d47. License: Apache-2.0 (plus MIT file and NOTICE).
- Why not: it is a local Python command-line tool (about 30 dependencies) that builds a graph from a repository, and its installer edits CLAUDE.md and adds a hook. Parked until you have a large repository to map. Not installed, not packaged.

### Matt Pocock skills not packaged

- `wayfinder` (Class C): its core mechanic is a shared map on an issue tracker with assignee claims and parallel sessions.
- `code-review` (Class C): needs `git diff` on a repository and parallel sub-agents. Use the review finding template in `employee-hotline-product-lead` instead.
- The other upstream skills (tdd, implement, triage, and so on) were not in the approved set. They are available in Claude Code through the plugin.

## Overlap with skills you already have in Claude.ai

`diagram-design` overlaps with `agent-assistant-workflow-diagrammer`. `humanizer` overlaps with `agent-consultant-natural-writing-voice-writing-books`. `ponytail-*` and `security-audit` have no direct equivalent. If triggering feels crowded, upload the core set first (see INSTALLATION_REPORT.md).
