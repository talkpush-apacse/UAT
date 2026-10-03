# Interview guide

Ask at most 3 questions per turn. Skip a question when the brief or earlier messages already answer it (quote the answer instead). Record each answer as Confirmed, Assumed, or Unknown. Unknown answers become open items with an owner, never guesses.

If a brand new project has no brief, offer to run `product-scoping-playbook` first (goal, usage, users, data, flows, separate development database). Then come back here.

## Tier 1: the project (ask first)

1. **Name, purpose, aliases.** What is the project called, what does it do in one sentence, and what other names might you use when asking about it? (Feeds `project_label`, `purpose`, `project_aliases`, and the description.)
2. **What is at stake.** What is the most sensitive data or action in this product, and what goes wrong if it is exposed, changed, or wrong? (Drives the security principles. Why it matters: it decides how strict every later phase is.)
3. **Who builds and reviews.** Which tool builds it (default Replit) and which tool reviews code (default Claude Code)? (Feeds `builder_tool`, `reviewer_tool`.)

## Tier 2: the sensitive parts (domain security)

Ask these as needed, three at a time, most relevant first:

- **Users and access.** Who are the user types, and which records must each be unable to see? Are there privileged roles (administrators, reviewers)? Is it single-company or multi-tenant?
- **Data.** What kinds of data does it hold (personal, financial, health, employment, files)? How long must it be kept, and who decides? Who can delete it?
- **Outside the app.** Which external services touch the data (email, SMS, analytics, error tracking, AI services, storage)? What do they receive?
- **Files.** Does it accept uploads? What types, and who opens them?
- **Audit.** Does anything need an audit trail (who saw or changed what)? Must it be tamper-evident?
- **Claims.** What must the product, or you, never claim unless it is true? (For example anonymous, encrypted, compliant, certified, live.) Feeds `never_claim`.
- **Owner of risk.** Who at the client signs off on legal, privacy, and compliance wording? (Feeds `protected_text` and open items.)

For each answer ask yourself: is this a fact the user gave me, or my assumption? Label accordingly.

## Tier 3: users and UX

- **Context of use.** Who uses it, on what device, in what state of mind (rushed, stressed, expert, first time)? Internal tool or client-facing?
- **Tone and accessibility.** What tone is right (calm, efficient, formal)? Any accessibility requirements the client has stated?
- **Text that needs approval.** Which texts must never be rewritten freely (legal notices, privacy statements, consent language, retention disclosures, safety guidance)? Feeds `protected_text`.

## Tier 4: tools and naming

- **Specialist skills installed.** Which of these exist for you: grilling or discovery, spec and tickets, security audit, diagrams, simplicity review, humanizer, UX review? Give exact installed names. Feeds `specialist_skills`.
- **Skill name and variants.** What exact name should the skill have? Do you need both a prefixed (Claude.ai) and unprefixed (Claude Code) version?
- **Phase extras.** Is there anything specific you always want covered in a phase (for example a reviewer sign-off in phase 5)? Feeds `phase_extras`.

## Stop rule

Stop interviewing when every required key in `answers-schema.md` has a confirmed or assumed value, or is parked as an open item. Do not keep asking to make the skill longer.

## Suggesting defaults

You may propose security principles, UX principles, and review categories from general good practice, but label every suggestion "suggested" in the Gate A summary. The user confirms, edits, or removes each one.
