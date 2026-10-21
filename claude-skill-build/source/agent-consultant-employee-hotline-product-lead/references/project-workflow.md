# Project workflow: Employee Hotline

How to run each phase. SKILL.md has the rules and the gate summary. This file has the working detail.

## Standing artifacts

Keep these current. In Claude.ai they live in the conversation or project files; in the repository they live in the shared project documentation (the source of truth).

| Artifact | What it holds |
|---|---|
| Confirmed requirements | One row each: ID, statement, source (who said it, where, when), status |
| Assumptions | One row each: ID, statement, why assumed, who can confirm, impact if wrong |
| Open questions | One row each: ID, question, why it matters (scope, security, legal, architecture, cost), owner |
| Contradictions | Two sources quoted side by side, what each implies, who decides |
| Decision log | Date, decision, alternatives considered, who approved, source |
| Risk register | Risk, likelihood, impact, mitigation, owner, status |

Requirement IDs stay stable across phases (for example `REQ-014`) so reviews and Replit milestones can point at them.

## Recovering context

Before asking the user anything:

1. List what you can see: project files, uploaded documents, earlier messages, any decision log.
2. Extract confirmed requirements and decisions. Quote the source.
3. Extract things that look decided but have no source. Mark them as assumptions.
4. Note conflicts between sources.
5. Present a short summary: "Here is what I found. Here is what looks missing. Here are up to 3 questions that matter most."

If nothing exists yet, say so and start phase 1 with the three highest-impact questions.

## Asking good questions

High-impact means the answer changes scope, security posture, legal exposure, architecture, or cost. Examples of high-impact topics for this project: who may report (employees only, contractors, third parties), whether anonymous reporting is offered at all, who may see reporter identity, how long data is kept, which regions' employees use it, whether it is single-company or multi-tenant, which channels exist beyond the web portal.

Rules:

- At most 3 questions per turn.
- Offer a suggested answer only if clearly labelled as a suggestion.
- A question the documents already answer is not asked. Quote the answer instead.
- Park lower-impact questions in the open-questions list.

## Phase 1: Context Lock

**Purpose:** agree on what is known before designing anything.
**Inputs:** whatever exists (briefs, emails, contracts, prior specs, user statements).
**Work:** run the context recovery steps. Build the standing artifacts. Identify contradictions. Identify the 3 questions that block the spec.
**Output:** context summary (one page), confirmed requirements, assumptions, open questions, contradictions.
**Exit criteria:** no unresolved contradiction that affects scope; blocking questions answered or explicitly parked with an owner.
**Gate question:** "Is this the right picture of the project? Anything wrong, missing, or assumed that should be confirmed?"

## Phase 2: Product Specification

**Purpose:** define the product in plain language so everyone builds the same thing.
**Cover:**
- Users and roles (reporter, intake or triage, investigator, case manager, administrator, auditor, other as confirmed).
- Reporting modes offered: anonymous, confidential, or both. State exactly what each means in this product.
- Case lifecycle and statuses, who can move a case between them, and what is recorded each time.
- Case types and routing (for example harassment, retaliation, discrimination, fraud, misconduct, workplace safety, other).
- Reporter follow-up: how a reporter checks status or answers questions, especially if anonymous.
- Conflict-of-interest handling (what happens if the report is about an investigator or administrator).
- Notifications: who is told what, through which channel, with what content.
- Data retention and deletion rules (as confirmed by the client; flag as an open question if not).
- Reporting and analytics needs, and how they avoid exposing identities.
- Out of scope, stated explicitly.
**Output:** product spec with requirement IDs. Ideally via `to-spec` if installed.
**Exit criteria:** every requirement is traceable to a source or flagged as an assumption.
**Gate question:** "Do you approve this spec as the source of truth? Which assumptions are now confirmed?"

## Phase 3: System Design

**Purpose:** choose the simplest architecture that meets the approved spec and the security principles.
**Cover:** components and responsibilities, data model, authentication and authorization model, where trust boundaries sit, integrations, hosting and regions, file storage, logging and monitoring, environments, backup and recovery.
**Diagrams (use `diagram-design` if installed):** architecture with trust boundaries, data or entity diagram, case lifecycle state machine, reporter journey, investigator journey.
**Simplicity pass:** for each component and dependency, ask what requirement it serves. Remove anything that serves none. Never remove security, privacy, authorization, auditability, integrity, or confirmed client requirements.
**Output:** design document, diagrams, list of decisions with alternatives considered.
**Exit criteria:** every requirement maps to a component; every external dependency has a stated purpose and data it receives.
**Gate question:** "Do you approve this design? Any component or dependency you want removed or added?"

## Phase 4: UX Definition

**Purpose:** define what reporters and investigators see and do, before screens are built.
**Cover:** flows, screen list, form fields (with the reason each field exists), error and empty states, confirmation states, reporter-facing explanations of anonymity and confidentiality, accessibility needs, mobile behavior, language and tone, who approves legal and privacy wording.
**Output:** flows and screen specs, copy requirements, list of texts that need owner approval.
**Exit criteria:** every field traces to a requirement; every sensitive statement has an owner for approval.
**Gate question:** "Do you approve these flows and screens? Who signs off the legal, privacy, and anonymity wording?"

## Phase 5: Security and Privacy Design Review

**Purpose:** find and decide on risks before code exists.
**Work:**
1. Walk `security-checklist.md` against the approved design. Mark each item Met, Gap, Not applicable, or Unknown, with evidence.
2. Build a threat model: assets (reporter identity, report content, evidence files, investigator notes, audit logs), actors (outsider, other employee, accused person, investigator, administrator, vendor), entry points, trust boundaries.
3. Run the anonymity analysis for every identifier listed in SKILL.md.
4. Record risks and decisions. Unknown items become open questions.
**Output:** threat model, anonymity analysis, security and privacy requirements (with IDs), risk register.
**Exit criteria:** no Unknown on a critical item; every Gap has a decision (fix, accept with owner, or defer with date).
**Gate question:** "Do you approve these security and privacy requirements and the accepted risks?"

## Phase 6: Replit Build Plan

**Purpose:** turn the approved spec, design, UX, and security requirements into milestones Replit can build.
**Work:** split into thin vertical milestones (each one demonstrable on its own). Put foundations first (authentication, authorization, audit log, data model) so later milestones do not retrofit them. Write each milestone with `replit-handoff-template.md`. Use `to-tickets` if installed for slicing and blocking order.
**Output:** ordered milestone list, then one full handoff at a time.
**Exit criteria:** each milestone lists requirement IDs, exclusions, dependencies, tests, and checks.
**Gate question:** "Milestone N is ready. Approve sending it to Replit?"

## Phase 7: Implementation Review

**Purpose:** independently check what Replit built against the approved documents.
**Work:** collect evidence (code, screenshots, test output, a description of what was run). Review against the milestone's acceptance criteria, security checks, and UX checks. Write findings with `review-finding-template.md`. Do not modify code.
**Output:** findings list, summary of what passed, what failed, what could not be verified.
**Exit criteria:** every acceptance criterion marked Pass, Fail, or Not verified.
**Gate question:** "Do you accept these findings? Should they go to Replit as written?"

## Phase 8: Production Readiness Review

**Purpose:** decide whether the system is safe to put in front of real employees.
**Check:** all milestones reviewed; no open critical or high findings without an approved exception; security checklist has no Unknown on critical items; retention and deletion work as specified; backups and recovery tested; monitoring and alerting exist without logging sensitive content; incident plan exists (including a plan for a suspected breach of reporter identity); access review of administrator and investigator accounts done; legal, privacy, and anonymity wording approved by its owner; a pilot or staged rollout plan exists if the client wants one.
**Output:** go or no-go summary, remaining risks with owners, launch conditions.
**Gate question:** "Approve for production, or not approved?"

Three delivery states must not be blurred in anything you write: built and internally tested, shared for client testing, live for real employees. Use the right one.

## When something changes mid-project

- A new requirement: add it as an assumption or a confirmed requirement with its source, then check which approved phases it affects. Re-open those gates.
- A defect found in review that comes from the spec: go back to the spec, fix, re-approve, then update the milestone.
- Replit reports the spec is silent on something: log it as an open question, get a decision, record it, then update the handoff.
