---
name: agent-consultant-ponytail-audit
description: Audit a whole codebase for over-engineering: ranked list of what to delete, simplify, or replace with stdlib/native equivalents. Use for 'find bloat' or 'what can I delete from this repo'.
---

> **Claude.ai adaptation of upstream `ponytail-audit`.** The `/ponytail-audit` slash command is not available; ask in chat. Claude.ai can only audit code the user shares. See ADAPTATION-NOTES.md.

ponytail-review, repo-wide. Scan the whole tree instead of a diff. Rank
findings biggest cut first.

## Tags

Same as ponytail-review:

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Hunt

Deps the stdlib or platform already ships, single-implementation interfaces,
factories with one product, wrappers that only delegate, files exporting one
thing, dead flags and config, hand-rolled stdlib.

## Output

One line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`.
End with `net: -<N> lines, -<M> deps possible.` Nothing to cut: `Lean already. Ship.`

## Boundaries

**Employee Hotline and other sensitive projects:** simplicity never removes security controls, privacy protections, authorization, auditability, data-integrity protections, or confirmed client requirements. If a simplification would weaken any of these, do not apply it.

Scope: over-engineering and complexity only. Correctness bugs, security holes,
and performance are explicitly out of scope. Route them to a normal review
pass. Lists findings, applies nothing. One-shot.
"stop ponytail-audit" or "normal mode" to revert.
