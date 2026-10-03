# Employee Hotline Skills: Discovery and Proposed Plan

**Update 2026-10-03:** the plan below was approved with these decisions: (1) no installs in the container, ZIPs only, for both Claude.ai and local Claude Code; (2) skip the Impeccable and Ponytail hooks; (3) Matt Pocock reco accepted, and after reading the skills the Claude.ai set became 7 (`wayfinder` and `code-review` were dropped as Claude Code only). Results are in INSTALLATION_REPORT.md. The text below is the original discovery record.

Status when written: DISCOVERY ONLY. Nothing has been installed. No Claude settings were changed.
Date: 2026-10-03
Upstream clones used for inspection live in the session scratchpad (not in this repo). All were shallow clones of the default branch, pinned below.

## 1. Where this ran

This session runs in a cloud container (root user, ephemeral). Its `~/.claude` is the container's, not the laptop's.
Anything installed here is discarded when the container is reclaimed. The ZIPs under `dist/` are what persist for Claude.ai.
For Claude Code on the laptop, the plan produces a reviewed install script and commands to run there.

## 2. Existing Claude configuration (container)

| Item | Finding |
|---|---|
| `~/.claude/skills/` | `session-start-hook` and `synced/` (a managed bucket of about 90 Talkpush and consultant skills synced from claude.ai). Not touched. |
| `~/.claude/plugins/` | `synced/` bucket only. `claude plugin list` reports no plugins installed. |
| Marketplaces | Only `anthropic-plugin-directory` (built in). |
| `~/.claude/settings.json` | Does not exist. `launcher-settings.json` has a Stop hook (git check) and `Skill` allow. Not touched. |
| Project `.claude/` | `launch.json` only (dev server). No skills or plugins. |
| Claude Code | 2.1.288. Node 22, npm 10, git 2.43, uv, python 3.11, zip, unzip, sha256sum present. |
| Already installed? | None of the 7 requested skills. No updates to check. |
| Name conflicts | No exact-name conflicts. Overlap in purpose only: `agent-assistant-workflow-diagrammer` vs Diagram Design; `agent-consultant-ux-*` and `product-design-frontend-ux` vs Impeccable. Built-in `code-review` skill vs Matt Pocock `code-review` (plugin version is namespaced `mattpocock-skills:code-review`, so no clash). |
| Conflicts among requested skills | Ponytail (always-on "write less" rules) vs Cloudflare security-audit and Impeccable (add checks and polish). Resolved by not enabling Ponytail's always-on hooks. Matt Pocock vs Impeccable and Ponytail: no methodology overlap. |

## 3. Upstream repos, pinned

| Skill | Official repo | Pinned commit | License | Notes |
|---|---|---|---|---|
| Matt Pocock Skills | mattpocock/skills | d81f3a1 (2026-09-29) | MIT | Plugin manifest v1.2.3, 27 skills listed. No hooks in the plugin. |
| Cloudflare Security Audit | cloudflare/security-audit-skill | c1c8a8c (2026-09-14) | MIT | One skill, 19 files, 2 zero-dependency `.cjs` validators. README documents only the Skills CLI (`npx skills add`). No plugin manifest. |
| Diagram Design | cathrynlavery/diagram-design | f903933 (2026-10-01) | MIT (plus THIRD_PARTY_LICENSES.md) | Plugin v2.6.51. No hooks. About 3.3 MB (HTML examples). PNG export needs Playwright, only if asked. Font links to Google Fonts in output. PRIVACY.md says no telemetry. |
| Impeccable | pbakaus/impeccable | e103efe (2026-10-03) | Apache-2.0 (NOTICE.md credits ehmo/platform-design-skills, MIT) | Plugin v4.5.0. Has hooks. Needs an engine binary. See risks. |
| Ponytail | DietrichGebert/ponytail | bb0bdd7 (2026-10-02) | MIT | Plugin v4.10.2. Has 3 hooks. See risks. `mikrammullah/PonyTail` is an older copy (last commit 2026-06-17, same license holder). Not used. |
| Humanizer (optional) | blader/humanizer | 225a6f3 (2026-09-27) | MIT | Single SKILL.md v3.1.0. Plugin, no hooks. |
| Graphify (optional) | Graphify-Labs/graphify | 0b60d47 (2026-10-02) | Apache-2.0 (plus LICENSE-MIT, NOTICE) | Python CLI v0.9.74, about 30 tree-sitter dependencies. |

Web search results disagreed on some repo owners (for example Ponytail). Ownership above was confirmed from the cloned repos' own README badges, git remotes, LICENSE and package metadata.

## 4. Things that execute code or change config (materially risky)

1. **Impeccable hooks.** The plugin registers hooks on SessionStart, every Edit/Write, and Stop. The first run downloads a binary from GitHub Releases into `~/.impeccable/bin/`, checked against a `.sha256` file from the same host (catches corruption, not a compromised release). Hooks run even if you deny the model's command. The SKILL.md also runs that binary at the start of each session.
2. **Ponytail hooks.** Three Node hooks (SessionStart, SubagentStart, UserPromptSubmit) inject an always-on ruleset into every prompt and every subagent, and write state files under `~/.claude` and `~/.config/ponytail`. A grep of the hook files found no network calls. Full read still to be done before any install. This would push "lazy senior dev" rules into security reviews.
3. **Graphify.** `uv tool install graphifyy` pulls about 30 PyPI packages. `graphify install` writes a section into CLAUDE.md and adds a PreToolUse hook to Claude settings. Semantic mode can send content to a model backend.
4. **Skills CLI (`npx skills add ...`).** Official method for Cloudflare, but it runs a third-party npm package. The result is a plain file copy.
5. **Diagram Design PNG export.** Only if asked: `pip install playwright` plus a Chromium download. Not part of install.

No sudo is needed anywhere.

## 5. Proposed Claude Code installation plan (pending approval)

| Skill | Method | Hooks | Scope |
|---|---|---|---|
| Matt Pocock | `claude plugin marketplace add mattpocock/skills`, then `claude plugin install mattpocock-skills@mattpocock --scope user` | None | user |
| Cloudflare security-audit | Copy `skills/security-audit/` from pinned commit c1c8a8c into `~/.claude/skills/security-audit/` (same result as the Skills CLI, no third-party package executed) | None | user |
| Diagram Design | `claude plugin marketplace add cathrynlavery/diagram-design`, then `claude plugin install diagram-design@diagram-design --scope user` | None | user |
| Impeccable | Copy `plugin/skills/impeccable/` from pinned commit e103efe into `~/.claude/skills/impeccable/`. No hooks. Engine binary downloads on first use only, and I will ask you first. | Off | user |
| Ponytail | Copy `skills/ponytail`, `ponytail-review`, `ponytail-audit` from pinned commit bb0bdd7 into `~/.claude/skills/`. No hooks, so no always-on injection and no lite/full/ultra modes. | Off | user |
| Humanizer (optional) | Prepared, not installed | n/a | n/a |
| Graphify (optional) | Prepared notes only, not installed | n/a | n/a |

Skipped as instructed: Superpowers, Addy Osmani methodology, I Have ADHD.
Every copied skill keeps its LICENSE (and NOTICE where present). Backups: nothing is overwritten. If a target path exists, I stop and ask.
Rollback is `claude plugin uninstall ...` for plugins and deleting the copied folders.

## 6. Claude.ai portability (preliminary, confirmed during packaging)

| Skill | Class | Why | ZIPs planned |
|---|---|---|---|
| employee-hotline-product-lead | A (original) | Pure markdown, written by us | 1 |
| Cloudflare security-audit | B | Core flow assumes a Task/sub-agent tool and local Node validators. Needs a clearly labelled "single-pass" adaptation. | 1 |
| Diagram Design | B | Output (HTML/SVG) works. Strip plugin slash commands, `~/.diagram-design` profiles, Playwright PNG export. Large (3.3 MB), upload limit unverified. | 1 |
| Ponytail | A | Pure markdown. Hooks and modes are not portable and are left out. | 2 to 3 (ponytail, ponytail-review, ponytail-audit) |
| Humanizer | A | Single SKILL.md | 1 |
| Matt Pocock | B for a subset, C for the rest | `to-spec` and `to-tickets` depend on `/setup-matt-pocock-skills` and a repo issue tracker. Skills that reference each other break when split into separate ZIPs. | Proposed 7 to 9 (see decision 3) |
| Impeccable | C | SKILL.md requires the local engine binary for `context` and every command. Not meaningful without it. | 0 |
| Graphify | C | Local Python CLI plus hooks | 0 |

Limits I will state in the report instead of assuming: Claude.ai ZIP size and file-count limits, whether Claude.ai runs the `.cjs` validators, and the exact frontmatter limits (I will re-check the Agent Skills spec before building).

## 7. Build and test plan after approval

1. Create/verify `source/`, `dist/`, `reports/` (already created).
2. Install per section 5. Verify with `claude plugin list`, skill discovery, and one harmless invocation per skill (read-only prompt, no network, no file writes).
3. Build `source/<skill>/` from pinned upstream with minimum edits. Each adapted file gets an "Adapted from upstream <commit>" note. LICENSE/NOTICE kept.
4. Author `employee-hotline-product-lead` (SKILL.md plus the 4 references you listed, original text only).
5. Validate every directory (frontmatter, referenced files, absolute paths, secrets scan, no `.git` or `node_modules`, binaries), ZIP one per skill with the skill folder as top level, list each archive, SHA-256 each.
6. Write `claude-ai-portability.md` and `INSTALLATION_REPORT.md`.

`claude-skill-build/` sits inside the Talkpush UAT repo checkout. I will not commit or push it unless you say so.
