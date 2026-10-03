# Answers file schema

One JSON object. `scripts/render_project_skill.py` reads it. Required keys must exist and be non-empty.

## Required

| Key | Type | Notes |
|---|---|---|
| `skill_name` | string | Lowercase letters, numbers, hyphens. 64 characters or fewer. No "anthropic" or "claude". Becomes the folder name and the frontmatter `name`. |
| `description` | string | 1 to 200 characters. Say what the skill does and when to use it. No XML-like tags. |
| `project_label` | string | Human name used in headings, for example "Referral Portal". |
| `project_aliases` | list of strings | Other names the user may say. Shown in the intro. Include terms that should trigger the skill. |
| `purpose` | string | One or two sentences on what the project does and why it is sensitive or important. |
| `security_principles` | list of strings | The topics every design must state a position on. Short noun phrases. |
| `ux_principles` | list of strings | Full sentences. |
| `specialist_skills` | list of objects | Each has `need`, `skill` (exact installed name), `use`. Rendered as a table. |

## Optional (defaults in brackets)

| Key | Type | Used in |
|---|---|---|
| `builder_tool` ["Replit"] | string | Roles table, phase 6, handoff, reviews. The handoff file is still named `replit-handoff-template.md`. |
| `reviewer_tool` ["Claude Code"] | string | Roles table. |
| `domain_notes_md` [""] | markdown string | Inserted in the security principles section of SKILL.md. Use it for special distinctions (for example anonymous versus confidential). |
| `never_claim` [empty] | list | "Never claim" list in SKILL.md. |
| `protected_text` [empty] | list | "Copy rule" section. Omitted if empty. |
| `phase_extras` [empty] | object | Keys "1" to "8", each a list. Adds "Also cover (project-specific)" bullets to that phase. |
| `open_question_examples` [empty] | list | High-impact topics typical for this project. |
| `open_items` [empty] | list | Unresolved items at creation. Each should name an owner. Shown at the top of the workflow file. |
| `handoff_security_checks` [empty] | list | Extra security checkboxes in every handoff. |
| `handoff_ux_checks` [empty] | list | Extra UX checkboxes in every handoff. |
| `checklist_domain_sections` [empty] | list of objects | Each has `title`, optional `intro`, `items` (list). Rendered as checkbox sections in the security checklist. |
| `checklist_extra_md` [""] | markdown string | Appended to the domain section (for example a table). |
| `review_categories` [12 general categories] | list | Category list in the finding template. |
| `example_finding_md` [generic example] | markdown string | Example finding. |
| `severity_notes_md` [""] | markdown string | Extra severity guidance. |
| `legal_note` [standard note] | string | Last bullet in "Defaults for output". |
| `version` ["1.0.0"] | string | Version line at the end of SKILL.md. |
| `generated_on` [today] | string | Date in the version line. |

## Rules

- Do not put secrets, client names that must stay private, or personal data in the answers file.
- Do not use em dashes. The renderer warns and the strict validator fails.
- Templates cannot be edited per project. Put project-specific content in these keys.
- Keep strings plain. The renderer inserts them as written.
