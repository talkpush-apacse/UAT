# Domain pack guide

The domain pack is the part of the answers file that is specific to one project. It decides how strict the generated skill is. Write it carefully, label what is unverified, and get it reviewed by someone who knows the domain.

## What goes in each part

| Part | Good looks like | Avoid |
|---|---|---|
| `security_principles` | Short noun phrases naming what every design must take a position on: "authorization", "record-level access", "file metadata", "audit-log integrity". 15 to 30 items. | Sentences, regulations, vendor names, or solutions. |
| `domain_notes_md` | Distinctions the project depends on, stated as definitions. Example: anonymous reporting versus confidential reporting. | Legal conclusions. Long essays. |
| `never_claim` | Claims that would damage trust if untrue: "Never claim X unless the architecture supports it." | Vague rules ("be careful"). |
| `ux_principles` | Rules tied to the users' real situation (stressed, rushed, mobile, expert). | Style trends. Brand guidelines (use a design-system skill for that). |
| `protected_text` | Kinds of text the owner approves: legal notices, privacy statements, consent language, retention disclosures, safety guidance. | Listing every sentence. |
| `phase_extras` | Specific things to cover in one phase. | Repeating the generic phase content. |
| `checklist_domain_sections` | Pass or fail items a reviewer can check against evidence. | Items that cannot be checked. |
| `open_items` | Unresolved questions, each with an owner. | Guesses written as facts. |

## Core invariants (never weaken in a domain pack)

The core templates guarantee: recovers context first, separates confirmed from assumed, never invents requirements, shows contradictions, asks 3 high-impact questions at most, approval-gated phases, no application code in Claude.ai, the handoff rule, reviews without code changes, evidence and "not verified" labels, a separate development database before feature work, and simplicity never overriding security, privacy, authorization, auditability, data integrity, or confirmed client requirements. If a project asks to relax one of these, raise it with the user as a separate decision and record who approved it. Do not do it inside the answers.

## Credibility rules for generated content

- Mark domain security content as a starting point that needs review. The generated SKILL.md says so in its version section.
- Do not state a law, standard, or certification applies unless the user supplied it and its source. Put regulatory questions in `open_items` for the client's legal or compliance owner.
- Do not tell the user a skill is "secure", "compliant", or "ready". Say what was validated and what was not.
- Keep the three delivery states apart in anything you write: built and internally tested, shared for client testing, live for real users.
- Do not copy text from third-party skills into a project skill. Name the specialist skill and say what to use it for.

## Draft review checklist (Gate B)

Check the rendered skill against these before showing it:

1. The description is 200 characters or fewer and names the project, the aliases, and what the skill does.
2. Every security principle came from the user or is labelled suggested and was confirmed.
3. No principle is a solution or a regulation.
4. `never_claim` rules are specific and each can be checked.
5. `protected_text` matches what the owner really approves.
6. Specialist skill names match what is installed where the skill will run.
7. Open items each have an owner.
8. Nothing in the text states a legal requirement as fact.
9. No em dashes, no leftover placeholders (the validator checks both).
10. The skill does not tell Claude to write application code.

If scripts cannot run, do this checklist by hand, check that the folder name equals the `name`, that the description is 200 characters or fewer, that every file in `references/` mentioned in SKILL.md exists, and say clearly that automated validation was not run.

## Fork mode

When a new project resembles an existing one:

1. Start from the existing answers file.
2. Mark every key as carried over, modified, new, or removed, and show that list at Gate A.
3. Re-interview only for modified and new items. The security principles and never-claim rules still need a fresh look, since a fork can change what is at stake.
4. Give the new skill a new name and version 1.0.0.

## Updating a skill

Change the answers, bump `version`, say what changed in the changelog sentence of your handover message, re-render, re-validate, rebuild the ZIP, and tell the user to re-upload.
