# Replit handoff template

One milestone per handoff. Send a milestone only when its spec, design, UX, and security approvals exist and its dependencies are done. Write plainly. Replit will build exactly what is written here.

## Required rule (include verbatim in every handoff)

"Use the approved specifications as the source of truth. If implementation requires behavior that the specification does not define, stop and ask rather than inventing functionality."

---

## Milestone [N]: [short name]

**Handoff status:** Draft / Approved by [name] on [date]
**Source documents:** [names and versions of the approved spec, design, UX, and security requirements]

### 1. Objective

One or two sentences. What can someone do or see after this milestone that they could not before?

### 2. Requirements included

| ID | Requirement (one line) | Source document |
|---|---|---|
| REQ-000 | | |

### 3. Explicitly excluded scope

List what this milestone must NOT build, even if it seems related or convenient.

- 

### 4. Dependencies

- Milestones that must be finished and reviewed first:
- Accounts, keys, services, or decisions needed (do not paste secrets into this document):
- Open questions that must be answered before starting:

### 5. Implementation instructions

Numbered steps in the order to do them. Say what to build and where it must behave in a particular way. Include data fields, roles, statuses, and messages as defined in the approved spec. Do not include invented behavior.

1. 

Security and privacy constraints that apply to every step (from the approved security requirements):

- 

### 6. Acceptance criteria

Each criterion is something a reviewer can check as pass or fail.

- [ ] AC-1: 
- [ ] AC-2: 

### 7. Required tests

Tests Replit must write or run, and report results for.

| Test | What it proves | Linked AC or requirement |
|---|---|---|
| | | |

Include at least: success path, failure path, permission denied for each role that should not have access, and one test that tries to reach another case or tenant's data (if applicable).

### 8. Security checks

Replit confirms each of these and reports how it checked.

- [ ] Access is enforced on the server for every new endpoint or action.
- [ ] No secrets, report content, names, or identifiers in code, logs, or error messages.
- [ ] Anonymous paths do not capture or store identifiers (see approved anonymity analysis).
- [ ] New audit log events are written for the actions in this milestone.
- [ ] Inputs are validated on the server.
- [ ] Items specific to this milestone:

### 9. UX checks

- [ ] Matches the approved flows and screens.
- [ ] Keyboard and screen reader use works for new screens.
- [ ] Usable on a phone.
- [ ] Wording matches approved copy. Legal, privacy, consent, and anonymity text is used exactly as approved.
- [ ] Error, empty, and confirmation states exist and are calm and clear.

### 10. Definition of done

Done means all of these are true:

- [ ] Every acceptance criterion passes.
- [ ] Required tests are written and passing, and results are reported.
- [ ] Security checks and UX checks are completed and reported.
- [ ] No behavior was added that is not in the approved specification. Any gap was raised as a question.
- [ ] Notes for the reviewer: what was built, what was not, what could not be tested, and any question raised.
- [ ] The change is committed to the shared repository and the documentation is updated.

### 11. How to report back

Reply with: what was built, the test results, the security and UX check results, anything skipped or unclear, and questions raised. Do not mark the milestone done on your own. An independent review follows.
