# Installation report

Date: 2026-10-03. Built in a cloud container. Nothing was installed into any Claude configuration (your decision: ZIPs only).

## Where every ZIP is

Repository folder (branch `claude/gifted-cerf-7r70ce`, draft PR https://github.com/talkpush-apacse/UAT/pull/14): `claude-skill-build/`. In the session container: `/home/user/UAT/claude-skill-build/`.

**Claude.ai ZIPs (adapted): `claude-skill-build/dist/`**

- `dist/employee-hotline-product-lead.zip`  (SHA-256 `1f34faa4482ae7db6b081df1f7617d51bf22e32d0519ccaf672ca3c9fcdea29d`)
- `dist/security-audit.zip`  (SHA-256 `a022fc03082dcc928f3c0c43a1615a9415d5d58f6060455cb984d4709b689848`)
- `dist/diagram-design.zip`  (SHA-256 `4bc6de31d0fb762c5477bb15be74d03de04e361953367ef914ea01ea944981d1`)
- `dist/ponytail-review.zip`  (SHA-256 `fc0ba4e6f7be2b7927a7c177f02e704442e93df54589a9ce451cc60eaa1cf113`)
- `dist/grilling.zip`  (SHA-256 `43926a3990d9d54b4bbad9172554c6b2cc3572b16e4fe0edc91b0086a553a928`)
- `dist/domain-modeling.zip`  (SHA-256 `16207482bbf9ba639f846a0772941e4ac7f9357934bacf7e044e6ec725409b46`)
- `dist/to-spec.zip`  (SHA-256 `d8b8507d882ef44d4bbde3ec99e1d7fc1f2c9b1d01e74f1c6f32cf1cea99e1ae`)
- `dist/to-tickets.zip`  (SHA-256 `68c065cfa3d950360a120ff5b1501885f0bc97eed6291af99bd574f1744cdb42`)
- `dist/to-questionnaire.zip`  (SHA-256 `8beb0816989d7ddc2ebc068e1f4a8134e7ffce6252c379bebd267888eea0f3bf`)
- `dist/ponytail.zip`  (SHA-256 `d7b7cd8d6115b2404764beb35c5f79073e9ad0699e7fca8604960fe9927174e0`)
- `dist/ponytail-audit.zip`  (SHA-256 `f7fb88651612df09176b1421a5f9e5d1fa00bf9d45d647866d97067b96e293de`)
- `dist/grill-with-docs.zip`  (SHA-256 `e896968f6c23c9989350fe7c33c7743b32e5057d1cbe40eb81cf95ef4fefbb53`)
- `dist/codebase-design.zip`  (SHA-256 `fca4040f04d5059e7fce4df49022d9ea05577b96d51f2ac4b554db5c5a118f84`)
- `dist/humanizer.zip`  (SHA-256 `a2025c47dd8e73278a2e9ac6ae7e8d840d9aea0fc8183ea88e1cdf684d765343`)

**Claude Code ZIPs (unmodified upstream, no hooks): `claude-skill-build/dist/claude-code/`**

- `dist/claude-code/employee-hotline-product-lead.zip`  (SHA-256 `1f34faa4482ae7db6b081df1f7617d51bf22e32d0519ccaf672ca3c9fcdea29d`)
- `dist/claude-code/impeccable.zip`  (SHA-256 `f721f649fce0fc3858252475fede1b5766d6f74a0ad4b74fa8206e4d41322aa7`)
- `dist/claude-code/security-audit.zip`  (SHA-256 `3fc55951e3d419099aa8a6c5777fdb344fb096edfcee5fb382c273b7063ccf97`)
- `dist/claude-code/ponytail.zip`  (SHA-256 `31802be41605ed485540061edd3f59acd8f31cb0202838ef99bc29b2978b6c96`)
- `dist/claude-code/ponytail-review.zip`  (SHA-256 `abe4e81344515f4d85492683d1396a58b214a26edf3e2e2da9ceea2dd42da63c`)
- `dist/claude-code/ponytail-audit.zip`  (SHA-256 `cd167ed2310c3da5a890d78ca2553dfb4c1927ea32dd695a18675374b480e660`)

Checksum files: `dist/SHA256SUMS.txt` and `dist/claude-code/SHA256SUMS.txt`. Source folders: `source/` (Claude.ai) and `source-claude-code/`.

## Claude Code

| Status | Items |
|---|---|
| Installed successfully | None. Nothing was installed in the container, as you decided. |
| Already installed | None of the requested skills were present. |
| Updated | None. |
| Failed | None. |
| Requires manual action | 1. Run `./install-claude-code-skills.sh` on your machine (verifies checksums, never overwrites, no sudo, no hooks) to add the 6 skills in `dist/claude-code/`. 2. Inside Claude Code run the plugin commands below. 3. Restart Claude Code. |

Plugin commands (official methods, NOT executed here, so unverified):

```
/plugin marketplace add mattpocock/skills
/plugin install mattpocock-skills@mattpocock
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

Optional: `/plugin marketplace add blader/humanizer` then `/plugin install humanizer@humanizer`.

Do not also install the Claude.ai ZIPs into Claude Code. Matt Pocock's plugin already supplies those skills with full features, and installing both gives you every skill twice.

Checks that were run: all 6 Claude Code skills and all 14 Claude.ai skills were discovered by Claude Code when placed in a throwaway project folder (not `~/.claude`). The hotline skill was invoked once and listed its 8 phases correctly. The install script was tested against a throwaway folder: dry run, install, and a second run that skipped everything. Impeccable's launcher keeps its executable bit.

## Claude.ai

| Status | Items |
|---|---|
| ZIP ready | All 14 in `dist/` (list above) |
| Adapted | All 13 third-party skills have an ADAPTATION-NOTES.md (the 14th, `employee-hotline-product-lead`, is original). Ten have instruction edits: `security-audit`, `diagram-design`, `ponytail`, `ponytail-audit`, `grilling`, `grill-with-docs`, `to-questionnaire`, `to-spec`, `to-tickets`, `codebase-design`. Three have metadata edits plus an added note or guard only: `domain-modeling`, `humanizer`, `ponytail-review`. |
| Not portable | `impeccable`, `graphify`, Matt Pocock `wayfinder` and `code-review` (Class C) |
| Requires manual action | Upload each ZIP yourself. Anthropic's docs say Settings, then Features (the label may differ in your account), then upload a skill ZIP. Needs a plan with code execution enabled. Skills are per user and do not sync from Claude Code. |

## Which ZIPs to upload to Claude.ai

Start with these 9 (the core set):

1. `employee-hotline-product-lead.zip`
2. `security-audit.zip`
3. `diagram-design.zip`
4. `ponytail-review.zip`
5. `grilling.zip`
6. `domain-modeling.zip`
7. `to-spec.zip`
8. `to-tickets.zip`
9. `to-questionnaire.zip`

Add later if you want them: `ponytail.zip`, `ponytail-audit.zip`, `grill-with-docs.zip`, `codebase-design.zip`, `humanizer.zip`.

## Limitations to know

1. Claude.ai acceptance was not tested from here. Upload one small ZIP first (for example `grilling.zip`) to confirm the format is accepted, then the rest.
2. `diagram-design.zip` is about 0.98 MB zipped (3.3 MB unpacked, 246 files). Anthropic's docs do not state a size limit, so this is unverified.
3. `security-audit` in Claude.ai is guidance mode only. Run the unmodified skill in Claude Code for a full audit.
4. `to-spec` and `to-tickets` deliver Markdown, not issue tracker entries.
5. Several skills reference each other (`grill-with-docs` uses `grilling` and `domain-modeling`). Upload them together.
6. `ponytail` in Claude.ai only applies once invoked. It has no always-on mode, by design.
7. Impeccable (Claude Code) downloads its engine on first use from GitHub Releases. Approve that deliberately.
8. Descriptions in the Claude.ai versions are shortened to 200 characters or fewer. Trigger wording is therefore less detailed than upstream.

## Not installed, and why

- Impeccable hooks and Ponytail hooks: skipped by your decision (they run on every prompt or edit).
- Graphify: parked; installs about 30 packages and edits CLAUDE.md and hooks.
- Superpowers, Addy Osmani methodology, I Have ADHD: excluded as instructed.

## Other files

- `reports/DISCOVERY_AND_PLAN.md`: discovery findings and the plan you approved.
- `reports/claude-ai-portability.md`: per-skill portability detail.
- `reports/validation-results.json`: machine-readable validation output.
- `install-claude-code-skills.sh`: local install helper.
