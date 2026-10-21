---
name: agent-consultant-vibecoder-project-skill-builder
description: Use to create a reusable product-lead skill for a vibe-coded project (Replit, Next.js): interviews you, fills templates, validates and zips it. Covers specs, security, handoffs, reviews.
---

# Vibecoder Project Skill Builder

Builds a project-specific "product lead" skill for a vibe-coded project: a skill that runs the project through approval-gated phases (context, spec, design, UX, security review, build plan, implementation review, production readiness), writes build handoffs for Replit (or another builder), and reviews what comes back.

The method is fixed in the templates (the **core**). What changes per project is a short set of answers (the **domain pack**): security and privacy principles, claims the product must never make, UX principles, text that needs owner approval, and which specialist skills to use. A worked example is in `examples/employee-hotline.answers.json`.

## When to use this skill

- The user wants a repeatable skill for a new project, client implementation, or product.
- The user wants to update or fork an existing project skill.

Do not use it for:

- Discovering the product itself (goal, users, data, flows). That is `product-scoping-playbook` if installed. If a `PROJECT_BRIEF.md` exists, use it as input here.
- A general-purpose skill unrelated to project delivery. Use `skill-creator` if installed.

## Operating rules

1. Work in approval-gated steps. Never render, package, or hand over without the gates below.
2. Do not invent domain facts. Security principles, never-claim rules, and protected text come from the user, the project brief, or sources the user supplies. Anything you suggest yourself is labelled "suggested" and the user confirms or removes it.
3. Do not state legal or compliance requirements as fact. Put them in open items for the client's legal or compliance owner.
4. Ask at most 3 high-impact questions per turn, in the order given in `references/interview-guide.md`. Skip anything the project brief or earlier messages already answer.
5. Keep confirmed answers, assumptions, and unknowns in three separate lists.
6. Never edit the core templates for one project. If a project needs something the core lacks, put it in its answers (extras, phase extras, domain notes), or propose a core change to the user as a separate decision.
7. Generated text must not contain em dashes or leftover `{{placeholders}}`. The validator checks.
8. Be honest about validation. If scripts cannot run here (no code execution), build the files by hand from the templates, say validation was not run, and give the user the manual checklist from `references/domain-pack-guide.md`.

## Process

### Step 0: Recover context

Look for a project brief, existing project skills, earlier messages, and uploaded documents. If a similar project skill exists, offer **fork mode**: start from its answers file, list what is carried over, modified, new, and removed, and interview only for the deltas.

### Step 1: Interview

Use `references/interview-guide.md`. Four tiers: the project, the sensitive parts, the users and UX, and naming and tools. Stop asking when each required answer key (see `references/answers-schema.md`) is confirmed, assumed, or parked as an open item.

### Step 2: Answers record (Gate A)

Write the answers as one JSON file following `references/answers-schema.md`, and show the user a plain summary:

- name, description (200 characters or fewer), aliases
- security and privacy principles, never-claim rules, protected text
- UX principles
- specialist skills
- assumptions and open items, each with an owner

Ask: "Do you approve these answers? Confirm, correct, or remove anything I suggested." Do not continue until approved.

### Step 3: Render

Run `python3 scripts/render_project_skill.py ANSWERS.json --out OUTPUT_DIR`. This writes `SKILL.md` and four files in `references/`: project workflow, security checklist, build handoff template, review finding template.

### Step 4: Review the draft (Gate B)

Read the rendered files. Check the list in `references/domain-pack-guide.md` ("Draft review checklist"). Show the user the key parts (description, principles, never-claim rules, phase extras) and ask: "Do you approve this draft?" Fix anything they flag by changing the answers and re-rendering, not by hand-editing the output.

### Step 5: Validate and package

1. `python3 scripts/validate_skill.py OUTPUT_DIR/<skill-name> --strict` must print `RESULT: PASS`.
2. `python3 scripts/build_zip.py OUTPUT_DIR/<skill-name> --out DIST_DIR` creates the ZIP and prints its SHA-256.
3. List the archive (`unzip -l`) and confirm the skill folder is the top level and `SKILL.md` is inside.

Report what was checked and what was not (for example: not uploaded to Claude.ai, not tested in Claude Code).

### Step 6: Hand over

Tell the user:

- where the ZIP is
- how to install it: Claude.ai uses Settings, then Features (the label may differ), then upload the ZIP. Claude Code unzips the folder into `~/.claude/skills/`.
- Claude.ai skills cannot be edited in place. Any change means a new version number, a new ZIP, and a re-upload.
- the open items that still need an owner

## Naming

Ask for the exact skill name if the user has not given one. Names are lowercase letters, numbers, and hyphens, 64 characters or fewer, and cannot contain "anthropic" or "claude". The folder name must equal the `name`. A project can need two variants (for example a prefixed name for Claude.ai and an unprefixed name for Claude Code). Render once per variant with a different `skill_name`, and say that the specialist skill names in the table must match what is installed in each place.

## Updating an existing project skill

Change the answers file, bump `version`, add what changed, re-render, re-validate, rebuild the ZIP, and tell the user to re-upload. Do not hand-edit generated files.

## What the generated skill guarantees

Every generated skill keeps these, so do not weaken them in answers:

- recovers context before asking, and separates confirmed requirements from assumptions
- never invents requirements, and shows contradictions
- asks only high-impact questions, 3 at a time
- uses approval-gated phases and never advances without confirmation
- writes no application code in Claude.ai
- includes the handoff rule: "Use the approved specifications as the source of truth. If implementation requires behavior that the specification does not define, stop and ask rather than inventing functionality."
- reviews without modifying code, with evidence and "not verified" labels
- requires a development database separate from production before feature work
- keeps simplicity from overriding security, privacy, authorization, auditability, data integrity, or confirmed client requirements
