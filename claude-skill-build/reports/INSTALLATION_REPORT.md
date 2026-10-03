# Installation report

Date: 2026-10-03. Built in a cloud container. Nothing was installed into any Claude configuration (your decision: ZIPs only).

## Where every ZIP is

Repository folder (branch `claude/gifted-cerf-7r70ce`, draft PR https://github.com/talkpush-apacse/UAT/pull/14): `claude-skill-build/`. In the session container: `/home/user/UAT/claude-skill-build/`.

**Claude.ai ZIPs (15, thirteen adapted third-party plus two original): `claude-skill-build/dist/`**

- `dist/agent-consultant-employee-hotline-product-lead.zip`  (SHA-256 `48df7a90e330edb2f6f0e5f5309d1948c7613681aae9231006ae9975c16c3f7a`)
- `dist/agent-consultant-security-audit.zip`  (SHA-256 `02999c753f243e61939bc9fc851df5b6a171615f319860125276ce9f44f582e3`)
- `dist/agent-consultant-diagram-design.zip`  (SHA-256 `56853c29cf67f6dd4a6882afa0b6b227fb54c8136555d4fd84afb0a7a0134bd9`)
- `dist/agent-consultant-ponytail-review.zip`  (SHA-256 `e607af9b35095e2cd47793c009b8aa5837b03ed68522189f43d0b935d889eabf`)
- `dist/agent-consultant-grilling.zip`  (SHA-256 `4119a4441521e5d11c933e6d677ccd812b75cc1e0bba6e1b1cafa7d39d466343`)
- `dist/agent-consultant-domain-modeling.zip`  (SHA-256 `50281d102c32f6bf74f04ab7d7fa7ed641ce1431288a06ff77f2da44934a3179`)
- `dist/agent-consultant-to-spec.zip`  (SHA-256 `21c9c681321c7cfae8e54b442e1f5830796cdbd67be1e874e8e59a8301bab6ce`)
- `dist/agent-consultant-to-tickets.zip`  (SHA-256 `eb22385a4a52d8e28efaf7ff163f5e0e001a05d5dcd735dd5de14577b1d445a8`)
- `dist/agent-consultant-to-questionnaire.zip`  (SHA-256 `ab2fbc7eeca9bb282f57d252426dd61f27025622f4d27f81a7e42123124a4b42`)
- `dist/agent-consultant-humanizer.zip`  (SHA-256 `becf2018c178c75bf75ea664399bf92178adf92c485ce07c51124404cf092e89`)
- `dist/agent-consultant-ponytail.zip`  (SHA-256 `9330d33d59e38cbe38f476d682975799787a6245190cd9182eb11bad0ec90ce0`)
- `dist/agent-consultant-ponytail-audit.zip`  (SHA-256 `6f73122d32bedc94f8bb300ecd8c3d2e004b61934e148c1fd91ad7c5c4ce46c7`)
- `dist/agent-consultant-grill-with-docs.zip`  (SHA-256 `de58fe9a32db185fc5ae6c9668bc2cb4640cd0e85c344666fd9744656153ae28`)
- `dist/agent-consultant-codebase-design.zip`  (SHA-256 `16aa06c22a416c80ff54e84ef93318ad1959d1d850b2175e6fca5d14d8c40709`)
- `dist/agent-consultant-vibecoder-project-skill-builder.zip`  (SHA-256 `194f1afd51b8e3a5878e7ec0313ff023990e2ccb39834c97d044a00451ed4f26`)

**Claude Code ZIPs (unmodified upstream, upstream names with no prefix, no hooks, 7): `claude-skill-build/dist/claude-code/`**

- `dist/claude-code/employee-hotline-product-lead.zip`  (SHA-256 `580fd0b07c2ddd680507ac86f84469677f95957840097bae89e038e0cd5e78a6`)
- `dist/claude-code/impeccable.zip`  (SHA-256 `f721f649fce0fc3858252475fede1b5766d6f74a0ad4b74fa8206e4d41322aa7`)
- `dist/claude-code/security-audit.zip`  (SHA-256 `69b5d9a92964c38902b3eabf23d7f98db9941466d627e0323ebb0de50d3cfc47`)
- `dist/claude-code/ponytail.zip`  (SHA-256 `14dc553d77204f9f47967c26e69e188fb0e4249f0587bbdae19a432d8afacecb`)
- `dist/claude-code/ponytail-review.zip`  (SHA-256 `e03f48e7f93a36839609dd7d8f2720726a1c7b51f7e79f9745876713fc455f7f`)
- `dist/claude-code/ponytail-audit.zip`  (SHA-256 `f6b878825b3e005d74d5617ac7170adef0660fd5c650fd4e0fb8db76d7f68aa4`)
- `dist/claude-code/agent-consultant-vibecoder-project-skill-builder.zip`  (SHA-256 `194f1afd51b8e3a5878e7ec0313ff023990e2ccb39834c97d044a00451ed4f26`)

Checksum files: `dist/SHA256SUMS.txt` and `dist/claude-code/SHA256SUMS.txt`. Source folders: `source/` (Claude.ai) and `source-claude-code/`.

## Claude Code

| Status | Items |
|---|---|
| Installed successfully | None. Nothing was installed in the container, as you decided. |
| Already installed | None of the requested skills were present. |
| Updated | None. |
| Failed | None. |
| Requires manual action | 1. Run `./install-claude-code-skills.sh` on your machine (verifies checksums, never overwrites, no sudo, no hooks) to add the 7 skills in `dist/claude-code/`. 2. Run the plugin commands below inside Claude Code. 3. Restart Claude Code. |

Claude Code uses the upstream names with no prefix (your decision). Plugin commands (official methods, NOT executed here, so unverified):

```
/plugin marketplace add mattpocock/skills
/plugin install mattpocock-skills@mattpocock
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

Do not install the Claude.ai ZIPs from `dist/` into Claude Code. The plugins give you those skills with full features, and installing both gives you every skill twice.

Checks run: all 22 skills (15 Claude.ai, 7 Claude Code) were discovered by Claude Code when placed in throwaway project folders (not `~/.claude`). The hotline skill was invoked once and listed its 8 phases correctly. The install script was tested against a throwaway folder (dry run, install, second run skipped everything).

## Claude.ai

| Status | Items |
|---|---|
| ZIP ready | All 15 in `dist/` (9 core, 5 optional, 1 reusable builder) |
| Adapted | All 13 third-party skills have an ADAPTATION-NOTES.md (the 14th, the hotline skill, is original). Ten have instruction edits: security-audit, diagram-design, ponytail, ponytail-audit, grilling, grill-with-docs, to-questionnaire, to-spec, to-tickets, codebase-design. Three have metadata edits plus an added note or guard only: domain-modeling, humanizer, ponytail-review. |
| Not portable | `impeccable`, `graphify`, Matt Pocock `wayfinder` and `code-review` (Class C) |
| Requires manual action | Upload each ZIP yourself. Anthropic's docs say Settings, then Features (label may differ), then upload a skill ZIP. Needs a plan with code execution enabled. Skills are per user and do not sync from Claude Code. |

## Which ZIPs to upload to Claude.ai (all use the `agent-consultant-` prefix)

Core set (9):

1. `agent-consultant-employee-hotline-product-lead.zip`
2. `agent-consultant-security-audit.zip`
3. `agent-consultant-diagram-design.zip`
4. `agent-consultant-ponytail-review.zip`
5. `agent-consultant-grilling.zip`
6. `agent-consultant-domain-modeling.zip`
7. `agent-consultant-to-spec.zip`
8. `agent-consultant-to-tickets.zip`
9. `agent-consultant-to-questionnaire.zip`

Optional set (5): `agent-consultant-humanizer.zip`, `agent-consultant-ponytail.zip`, `agent-consultant-ponytail-audit.zip`, `agent-consultant-grill-with-docs.zip`, `agent-consultant-codebase-design.zip`. Upload `agent-consultant-grill-with-docs` together with `agent-consultant-grilling` and `agent-consultant-domain-modeling`.

Reusable builder (1): `agent-consultant-vibecoder-project-skill-builder.zip`. Upload it when you want Claude.ai to create project skills for future projects.

## Limitations to know

1. Claude.ai acceptance was not tested from here. Upload one small ZIP first (for example `agent-consultant-grilling.zip`).
2. `agent-consultant-diagram-design.zip` is about 0.98 MB zipped (3.3 MB unpacked, 246 files). Anthropic's docs do not state a size limit, so this is unverified.
3. `agent-consultant-security-audit` in Claude.ai is guidance mode only. Run the unmodified skill in Claude Code for a full audit.
4. `to-spec` and `to-tickets` deliver Markdown, not issue tracker entries.
5. `agent-consultant-ponytail` in Claude.ai applies only once invoked. No always-on mode, by design.
6. Impeccable (Claude Code) downloads its engine on first use from GitHub Releases. Approve that deliberately.
7. Claude.ai descriptions are shortened to 200 characters or fewer, so trigger wording is less detailed than upstream.
8. Naming: Claude.ai ZIPs use the `agent-consultant-` prefix. Claude Code skills and plugins use upstream names with no prefix (including `impeccable`).

9. `agent-consultant-vibecoder-project-skill-builder` includes three Python scripts. They need code execution in Claude.ai, which I could not verify. Without it the skill builds files by hand and says validation was not run.
## Not installed, and why

- Impeccable and Ponytail hooks: skipped by your decision.
- Graphify: Class C, installs about 30 packages and edits CLAUDE.md and hooks. The only optional skill not included.
- Superpowers, Addy Osmani methodology, I Have ADHD: excluded as instructed.

## Other files

- `reports/DISCOVERY_AND_PLAN.md`, `reports/claude-ai-portability.md`, `reports/validation-results.json`, `install-claude-code-skills.sh`.
