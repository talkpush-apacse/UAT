# Claude.ai portability report

Generated 2026-10-03. All skills use the `agent-consultant-` prefix. Third-party skills are minimally adapted copies, not the official upstream versions. Every change is listed in each skill's ADAPTATION-NOTES.md, including the rename from the upstream name.

**Not verified:** the ZIPs were validated structurally and discovered by Claude Code in a throwaway project folder. They were NOT uploaded to Claude.ai from this environment, so Claude.ai acceptance is unconfirmed.

**Class key:** A = portable directly (metadata edits and small additions only). B = portable with adaptation (instructions edited). C = Claude Code only.

**Description limit:** the Claude.ai help center states 200 characters; the platform docs state 1024. They disagree, so every Claude.ai ZIP uses 200 or fewer. Names use lowercase letters, numbers and hyphens, no reserved words, 64 characters or fewer.

## Packaged for Claude.ai

| Skill | Repository | License | Class | Set | ZIP | SHA-256 |
|---|---|---|---|---|---|---|
| agent-consultant-employee-hotline-product-lead | Original (this project) | Original, no third-party content | A | core | dist/agent-consultant-employee-hotline-product-lead.zip | `48df7a90e330edb2f6f0e5f5309d1948c7613681aae9231006ae9975c16c3f7a` |
| agent-consultant-security-audit | https://github.com/cloudflare/security-audit-skill @ c1c8a8c | MIT (Cloudflare, Inc.) | B | core | dist/agent-consultant-security-audit.zip | `02999c753f243e61939bc9fc851df5b6a171615f319860125276ce9f44f582e3` |
| agent-consultant-diagram-design | https://github.com/cathrynlavery/diagram-design @ f903933 | MIT (Cathryn Lavery) plus THIRD_PARTY_LICENSES.md | B | core | dist/agent-consultant-diagram-design.zip | `56853c29cf67f6dd4a6882afa0b6b227fb54c8136555d4fd84afb0a7a0134bd9` |
| agent-consultant-humanizer | https://github.com/blader/humanizer @ 225a6f3 | MIT (Siqi Chen) | A | optional | dist/agent-consultant-humanizer.zip | `becf2018c178c75bf75ea664399bf92178adf92c485ce07c51124404cf092e89` |
| agent-consultant-ponytail | https://github.com/DietrichGebert/ponytail @ bb0bdd7 | MIT (DietrichGebert) | B | optional | dist/agent-consultant-ponytail.zip | `9330d33d59e38cbe38f476d682975799787a6245190cd9182eb11bad0ec90ce0` |
| agent-consultant-ponytail-review | https://github.com/DietrichGebert/ponytail @ bb0bdd7 | MIT (DietrichGebert) | A | core | dist/agent-consultant-ponytail-review.zip | `e607af9b35095e2cd47793c009b8aa5837b03ed68522189f43d0b935d889eabf` |
| agent-consultant-ponytail-audit | https://github.com/DietrichGebert/ponytail @ bb0bdd7 | MIT (DietrichGebert) | B | optional | dist/agent-consultant-ponytail-audit.zip | `6f73122d32bedc94f8bb300ecd8c3d2e004b61934e148c1fd91ad7c5c4ce46c7` |
| agent-consultant-grilling | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | core | dist/agent-consultant-grilling.zip | `4119a4441521e5d11c933e6d677ccd812b75cc1e0bba6e1b1cafa7d39d466343` |
| agent-consultant-grill-with-docs | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | optional | dist/agent-consultant-grill-with-docs.zip | `de58fe9a32db185fc5ae6c9668bc2cb4640cd0e85c344666fd9744656153ae28` |
| agent-consultant-domain-modeling | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | A | core | dist/agent-consultant-domain-modeling.zip | `50281d102c32f6bf74f04ab7d7fa7ed641ce1431288a06ff77f2da44934a3179` |
| agent-consultant-to-questionnaire | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | core | dist/agent-consultant-to-questionnaire.zip | `ab2fbc7eeca9bb282f57d252426dd61f27025622f4d27f81a7e42123124a4b42` |
| agent-consultant-to-spec | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | core | dist/agent-consultant-to-spec.zip | `21c9c681321c7cfae8e54b442e1f5830796cdbd67be1e874e8e59a8301bab6ce` |
| agent-consultant-to-tickets | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | core | dist/agent-consultant-to-tickets.zip | `eb22385a4a52d8e28efaf7ff163f5e0e001a05d5dcd735dd5de14577b1d445a8` |
| agent-consultant-codebase-design | https://github.com/mattpocock/skills @ d81f3a1 | MIT (Matt Pocock) | B | optional | dist/agent-consultant-codebase-design.zip | `16aa06c22a416c80ff54e84ef93318ad1959d1d850b2175e6fca5d14d8c40709` |
| agent-consultant-vibecoder-project-skill-builder | Original (this project) | Original, no third-party content | A | builder | dist/agent-consultant-vibecoder-project-skill-builder.zip | `194f1afd51b8e3a5878e7ec0313ff023990e2ccb39834c97d044a00451ed4f26` |

## Per-skill detail

### agent-consultant-employee-hotline-product-lead

- Upstream name: none (original skill)
- Repository: Original (this project)
- License: Original, no third-party content
- Claude Code installation method: ZIP from dist/claude-code via install script (Claude Code copy uses the name `employee-hotline-product-lead`, no prefix, and upstream-style names for the specialist skills)
- Claude Code installation status: Not installed in container (ZIPs only, your decision). Discovered by Claude Code in a throwaway folder; invoked once and returned the 8 phases.
- Claude.ai compatibility class: A
- Adaptations made: None (original).
- Features unavailable in Claude.ai: None.
- ZIP filename: dist/agent-consultant-employee-hotline-product-lead.zip
- SHA-256: `48df7a90e330edb2f6f0e5f5309d1948c7613681aae9231006ae9975c16c3f7a`

### agent-consultant-security-audit

- Upstream name: `security-audit`
- Repository: https://github.com/cloudflare/security-audit-skill @ c1c8a8c
- License: MIT (Cloudflare, Inc.)
- Claude Code installation method: Upstream documents the Skills CLI (`npx skills add`). We ship a plain copy of the pinned folder (unmodified, upstream name, no prefix) so no third-party package runs.
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter reduced, description shortened, renamed. Added 'Claude.ai availability' section: guidance mode only, full audit mode unavailable, findings labelled unverified, no running target code.
- Features unavailable in Claude.ai: Full audit mode: sub-agents, sandboxed execution, run directory, coverage ledger, independent verification.
- ZIP filename: dist/agent-consultant-security-audit.zip
- SHA-256: `02999c753f243e61939bc9fc851df5b6a171615f319860125276ce9f44f582e3`

### agent-consultant-diagram-design

- Upstream name: `diagram-design`
- Repository: https://github.com/cathrynlavery/diagram-design @ f903933
- License: MIT (Cathryn Lavery) plus THIRD_PARTY_LICENSES.md
- Claude Code installation method: Official plugin (keeps upstream name `diagram-design`): `/plugin marketplace add cathrynlavery/diagram-design` then `/plugin install diagram-design@diagram-design` (no hooks).
- Claude Code installation status: Not installed in container (ZIPs only, your decision). Plugin commands NOT executed here, so unverified.
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter reduced, description shortened, renamed. Added 'Claude.ai availability' section. Known unresolved references to repository-only maintainer scripts, same as upstream's installed skill.
- Features unavailable in Claude.ai: Plugin slash commands, saved brand profiles and project markers, PNG export without Playwright.
- ZIP filename: dist/agent-consultant-diagram-design.zip
- SHA-256: `56853c29cf67f6dd4a6882afa0b6b227fb54c8136555d4fd84afb0a7a0134bd9`

### agent-consultant-humanizer

- Upstream name: `humanizer`
- Repository: https://github.com/blader/humanizer @ 225a6f3
- License: MIT (Siqi Chen)
- Claude Code installation method: Official plugin: `/plugin marketplace add blader/humanizer` then `/plugin install humanizer@humanizer`.
- Claude Code installation status: Optional. Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: A
- Adaptations made: Frontmatter reduced (license, metadata removed), description shortened, renamed. Added a scope guard excluding legal, privacy, consent, whistleblower, compliance and retention text. Dropped agents/openai.yaml and scripts/validate-package.py.
- Features unavailable in Claude.ai: None of substance.
- ZIP filename: dist/agent-consultant-humanizer.zip
- SHA-256: `becf2018c178c75bf75ea664399bf92178adf92c485ce07c51124404cf092e89`

### agent-consultant-ponytail

- Upstream name: `ponytail`
- Repository: https://github.com/DietrichGebert/ponytail @ bb0bdd7
- License: MIT (DietrichGebert)
- Claude Code installation method: Skill folder copied (unmodified, upstream name, no prefix), hooks deliberately NOT installed (upstream plugin installs 3 hooks).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter reduced, description shortened, renamed. Slash-command levels replaced with asking in chat. 'Active every response' changed to 'active once invoked'. Added a guard under Boundaries that simplicity never removes security, privacy, authorization, auditability, integrity or confirmed client requirements (not in upstream).
- Features unavailable in Claude.ai: Hooks, /ponytail slash commands, statusline, subagent injection.
- ZIP filename: dist/agent-consultant-ponytail.zip
- SHA-256: `9330d33d59e38cbe38f476d682975799787a6245190cd9182eb11bad0ec90ce0`

### agent-consultant-ponytail-review

- Upstream name: `ponytail-review`
- Repository: https://github.com/DietrichGebert/ponytail @ bb0bdd7
- License: MIT (DietrichGebert)
- Claude Code installation method: Skill folder copied (unmodified, upstream name, no prefix), no hooks.
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: A
- Adaptations made: Frontmatter and description shortened, renamed. Added the same sensitive-project guard under Boundaries.
- Features unavailable in Claude.ai: /ponytail-review slash command.
- ZIP filename: dist/agent-consultant-ponytail-review.zip
- SHA-256: `e607af9b35095e2cd47793c009b8aa5837b03ed68522189f43d0b935d889eabf`

### agent-consultant-ponytail-audit

- Upstream name: `ponytail-audit`
- Repository: https://github.com/DietrichGebert/ponytail @ bb0bdd7
- License: MIT (DietrichGebert)
- Claude Code installation method: Skill folder copied (unmodified, upstream name, no prefix), no hooks.
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Frontmatter and description shortened, renamed. Added the same guard. It can only scan code the user shares.
- Features unavailable in Claude.ai: /ponytail-audit slash command; scanning an unshared repository.
- ZIP filename: dist/agent-consultant-ponytail-audit.zip
- SHA-256: `6f73122d32bedc94f8bb300ecd8c3d2e004b61934e148c1fd91ad7c5c4ce46c7`

### agent-consultant-grilling

- Upstream name: `grilling`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `grilling`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision). Plugin commands NOT executed here, so unverified.
- Claude.ai compatibility class: B
- Adaptations made: Renamed. Replaced the sub-agent lookup sentence with direct lookup or an explicit unconfirmed assumption.
- Features unavailable in Claude.ai: Sub-agents.
- ZIP filename: dist/agent-consultant-grilling.zip
- SHA-256: `4119a4441521e5d11c933e6d677ccd812b75cc1e0bba6e1b1cafa7d39d466343`

### agent-consultant-grill-with-docs

- Upstream name: `grill-with-docs`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `grill-with-docs`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Renamed. Replaced 'call the Skill tool twice' with an instruction to apply the renamed grilling and domain-modeling skills, with a fallback if either is missing (fallback wording is new). Removed disable-model-invocation.
- Features unavailable in Claude.ai: Skill tool invocation.
- ZIP filename: dist/agent-consultant-grill-with-docs.zip
- SHA-256: `de58fe9a32db185fc5ae6c9668bc2cb4640cd0e85c344666fd9744656153ae28`

### agent-consultant-domain-modeling

- Upstream name: `domain-modeling`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `domain-modeling`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: A
- Adaptations made: Renamed. Added a note: GLOSSARY.md and ADRs are delivered as documents, not written to a repository.
- Features unavailable in Claude.ai: Writing into a repository.
- ZIP filename: dist/agent-consultant-domain-modeling.zip
- SHA-256: `50281d102c32f6bf74f04ab7d7fa7ed641ce1431288a06ff77f2da44934a3179`

### agent-consultant-to-questionnaire

- Upstream name: `to-questionnaire`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `to-questionnaire`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Renamed. Delivery as file or in chat instead of writing to the current directory. Removed disable-model-invocation.
- Features unavailable in Claude.ai: Writing to a working directory.
- ZIP filename: dist/agent-consultant-to-questionnaire.zip
- SHA-256: `ab2fbc7eeca9bb282f57d252426dd61f27025622f4d27f81a7e42123124a4b42`

### agent-consultant-to-spec

- Upstream name: `to-spec`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `to-spec`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Renamed. Removed dependency on /setup-matt-pocock-skills and the issue tracker. Spec is delivered as a Markdown document. Description rewritten.
- Features unavailable in Claude.ai: Publishing to an issue tracker, triage labels.
- ZIP filename: dist/agent-consultant-to-spec.zip
- SHA-256: `21c9c681321c7cfae8e54b442e1f5830796cdbd67be1e874e8e59a8301bab6ce`

### agent-consultant-to-tickets

- Upstream name: `to-tickets`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `to-tickets`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Renamed. Step 5 replaced: tickets are delivered as Markdown in dependency order. Removed dependency on /setup-matt-pocock-skills. Description rewritten.
- Features unavailable in Claude.ai: Publishing to a tracker, native blocking links.
- ZIP filename: dist/agent-consultant-to-tickets.zip
- SHA-256: `eb22385a4a52d8e28efaf7ff163f5e0e001a05d5dcd735dd5de14577b1d445a8`

### agent-consultant-codebase-design

- Upstream name: `codebase-design`
- Repository: https://github.com/mattpocock/skills @ d81f3a1
- License: MIT (Matt Pocock)
- Claude Code installation method: Official plugin (keeps upstream name `codebase-design`): `/plugin marketplace add mattpocock/skills` then `/plugin install mattpocock-skills@mattpocock`. Or install the renamed ZIP from dist/ instead (fewer features, see ADAPTATION-NOTES.md).
- Claude Code installation status: Not installed in container (ZIPs only, your decision).
- Claude.ai compatibility class: B
- Adaptations made: Renamed. Clarified that the design-it-twice exercise runs sequentially. DESIGN-IT-TWICE.md unchanged and still describes sub-agents.
- Features unavailable in Claude.ai: Parallel sub-agents.
- ZIP filename: dist/agent-consultant-codebase-design.zip
- SHA-256: `16aa06c22a416c80ff54e84ef93318ad1959d1d850b2175e6fca5d14d8c40709`

### agent-consultant-vibecoder-project-skill-builder

- Upstream name: none (original skill)
- Repository: Original (this project)
- License: Original, no third-party content
- Claude Code installation method: ZIP from dist/claude-code via install script (same ZIP as Claude.ai; the name keeps the prefix because you specified it)
- Claude Code installation status: Not installed in container (ZIPs only, your decision). Discovered by Claude Code in a throwaway folder; 20 script tests passed; invoked once and opened with 3 interview questions.
- Claude.ai compatibility class: A
- Adaptations made: None (original). Includes three Python scripts (render, validate, zip) and templates.
- Features unavailable in Claude.ai: Scripts need Python and code execution; without it the skill builds by hand and says validation was not run.
- ZIP filename: dist/agent-consultant-vibecoder-project-skill-builder.zip
- SHA-256: `194f1afd51b8e3a5878e7ec0313ff023990e2ccb39834c97d044a00451ed4f26`

## Not packaged for Claude.ai

### impeccable (Class C)

- Repository: https://github.com/pbakaus/impeccable @ e103efe. License: Apache-2.0 (NOTICE.md credits ehmo/platform-design-skills, MIT).
- Why not for Claude.ai: its SKILL.md requires running a local engine program at the start of every session, and every command goes through it. The engine downloads a binary from GitHub Releases on first use.
- Claude Code: unmodified upstream skill folder, hooks NOT installed. ZIP: dist/claude-code/impeccable.zip, SHA-256 `f721f649fce0fc3858252475fede1b5766d6f74a0ad4b74fa8206e4d41322aa7`.
- Name: `impeccable` (no prefix, per your decision).
- Claude.ai alternative: your existing `agent-consultant-ux-*` and `agent-consultant-product-design-frontend-ux` skills, plus the UX principles in `agent-consultant-employee-hotline-product-lead`.

### graphify (Class C)

- Repository: https://github.com/Graphify-Labs/graphify @ 0b60d47. License: Apache-2.0 (plus MIT file and NOTICE).
- Why not: a local Python command-line tool (about 30 dependencies) whose installer edits CLAUDE.md and adds a hook. Not installed, not packaged. This is the one optional skill that cannot be included.

### Matt Pocock skills not packaged

- `wayfinder` (Class C): core mechanic is a shared map on an issue tracker with assignee claims and parallel sessions.
- `code-review` (Class C): needs `git diff` on a repository and parallel sub-agents. Use the review finding template in the hotline skill instead.
- The other upstream skills were not in the approved set. They are available in Claude Code through the plugin.

## Name collisions and overlap

No new name collides with your existing skills. Topic overlap: `agent-consultant-diagram-design` with `agent-assistant-workflow-diagrammer`; `agent-consultant-humanizer` with `agent-consultant-natural-writing-voice-writing-books`.
