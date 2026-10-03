#!/usr/bin/env python3
"""Render a project product-lead skill from an answers JSON file and the templates in ../templates.

Usage:
  python3 scripts/render_project_skill.py ANSWERS.json --out OUTPUT_PARENT_DIR

Writes OUTPUT_PARENT_DIR/<skill_name>/ with SKILL.md and references/*.md.
Standard library only. Exits non-zero on invalid answers or unresolved placeholders.
"""
import argparse, datetime, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent.parent
TEMPLATES = HERE / "templates"
DESC_LIMIT = 200
RESERVED = ("anthropic", "claude")

REQUIRED = {
    "skill_name": str, "description": str, "project_label": str, "project_aliases": list,
    "purpose": str, "security_principles": list, "ux_principles": list, "specialist_skills": list,
}
DEFAULT_CATEGORIES = ["Security", "Privacy", "Authorization", "Audit logging", "Data integrity",
                      "Retention and deletion", "Functional (spec mismatch)", "UX and accessibility",
                      "Copy and legal text", "Performance and reliability", "Simplicity", "Documentation"]
DEFAULT_EXAMPLE = (
    "**Finding ID:** F-007\n**Category:** Authorization\n**Severity:** High\n"
    "**Requirement affected:** REQ-012 \"A user can only see records they own.\"\n"
    "**Evidence:** The `listRecords` handler shared in message 4 filters by organization but not by owner (lines 31 to 36).\n"
    "**Why it matters:** Any signed-in user can read other users' records in the same organization.\n"
    "**Recommended correction:** Enforce the owner filter on the server in the shared query used by every list and export endpoint.\n"
    "**Acceptance test:** Sign in as user A and user B. User A requests a list and an export: no record owned by B appears in either. "
    "Request B's record ID directly as A: access is denied."
)
DEFAULTS = {
    "builder_tool": "Replit",
    "reviewer_tool": "Claude Code",
    "never_claim": [],
    "domain_notes_md": "",
    "protected_text": [],
    "handoff_security_checks": [],
    "handoff_ux_checks": [],
    "checklist_domain_sections": [],
    "checklist_extra_md": "",
    "phase_extras": {},
    "open_question_examples": [],
    "open_items": [],
    "review_categories": DEFAULT_CATEGORIES,
    "example_finding_md": DEFAULT_EXAMPLE,
    "severity_notes_md": "",
    "legal_note": ("Legal and regulatory requirements vary by country, industry, and employer. "
                   "Do not state a legal requirement as fact. Flag it as a question for the client's legal or compliance owner."),
    "version": "1.0.0",
    "generated_on": datetime.date.today().isoformat(),
}


def fail(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def load_answers(path):
    try:
        data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        fail(f"cannot read answers file: {e}")
    if not isinstance(data, dict):
        fail("answers file must be a JSON object")
    for k, t in REQUIRED.items():
        if k not in data:
            fail(f"missing required key: {k}")
        if not isinstance(data[k], t):
            fail(f"key {k} must be {t.__name__}")
    for k in ("security_principles", "ux_principles", "project_aliases", "specialist_skills"):
        if not data[k]:
            fail(f"key {k} must not be empty")
    ctx = dict(DEFAULTS)
    ctx.update(data)
    n = ctx["skill_name"]
    if not re.fullmatch(r"[a-z0-9-]{1,64}", n):
        fail("skill_name must be lowercase letters, numbers, hyphens, 64 characters or fewer")
    if any(r in n for r in RESERVED):
        fail("skill_name must not contain a reserved word (anthropic, claude)")
    d = ctx["description"].strip()
    if not d or len(d) > DESC_LIMIT:
        fail(f"description must be 1 to {DESC_LIMIT} characters (got {len(d)})")
    if re.search(r"<[A-Za-z/][^>]*>", d):
        fail("description must not contain XML-like tags")
    ctx["description"] = d
    for i, s in enumerate(ctx["specialist_skills"]):
        if not (isinstance(s, dict) and all(k in s for k in ("need", "skill", "use"))):
            fail(f"specialist_skills[{i}] needs need, skill, use")
    for i, s in enumerate(ctx["checklist_domain_sections"]):
        if not (isinstance(s, dict) and "title" in s and isinstance(s.get("items"), list)):
            fail(f"checklist_domain_sections[{i}] needs title and items (list)")
    for p in range(1, 9):
        ctx[f"phase_extra_{p}"] = list(ctx["phase_extras"].get(str(p), []))
    ctx["checklist_domain_note"] = ""
    if not ctx["checklist_domain_sections"] and not ctx["checklist_extra_md"].strip():
        ctx["checklist_domain_note"] = ("No domain-specific checks were provided when this skill was created. "
                                        "Add them (and regenerate) before relying on this checklist for this project.")
    # em dash check (house style): warn, do not fail
    blob = json.dumps(ctx, ensure_ascii=False)
    if "\u2014" in blob:
        print("WARNING: answers contain em dashes; rewrite them before sharing the skill", file=sys.stderr)
    return ctx


def bullets(items, box=False):
    pre = "- [ ] " if box else "- "
    return "\n".join(pre + str(i) for i in items)


def render_table(rows):
    out = ["| Need | Skill | Use it for |", "|---|---|---|"]
    for r in rows:
        out.append(f"| {r['need']} | `{r['skill']}` | {r['use']} |")
    return "\n".join(out)


def render_sections(secs):
    out = []
    for s in secs:
        out.append(f"### {s['title']}\n")
        if s.get("intro"):
            out.append(s["intro"] + "\n")
        out.append(bullets(s["items"], box=True) + "\n")
    return "\n".join(out)


IF_RE = re.compile(r"\{\{#if ([A-Za-z0-9_]+)\}\}(.*?)\{\{/if\}\}", re.S)
VAR_RE = re.compile(r"\{\{(?:(list|checks|inline|table|sections):)?([A-Za-z0-9_]+)\}\}")


def render(text, ctx):
    def cond(m):
        return m.group(2) if ctx.get(m.group(1)) else ""
    text = IF_RE.sub(cond, text)

    def sub(m):
        kind, key = m.group(1), m.group(2)
        if key not in ctx:
            fail(f"template references unknown key: {key}")
        v = ctx[key]
        if kind == "list":
            return bullets(v)
        if kind == "checks":
            return bullets(v, box=True)
        if kind == "inline":
            return ", ".join(v)
        if kind == "table":
            return render_table(v)
        if kind == "sections":
            return render_sections(v)
        if key == "description":
            return json.dumps(v, ensure_ascii=False)
        return str(v)
    text = VAR_RE.sub(sub, text)
    return re.sub(r"\n{3,}", "\n\n", text).rstrip() + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("answers")
    ap.add_argument("--out", required=True, help="parent directory; the skill folder is created inside it")
    ap.add_argument("--force", action="store_true", help="overwrite an existing output folder")
    a = ap.parse_args()
    ctx = load_answers(a.answers)
    out = pathlib.Path(a.out) / ctx["skill_name"]
    if out.exists() and not a.force:
        fail(f"{out} already exists (use --force to overwrite)")
    mapping = {
        "SKILL.md.tmpl": "SKILL.md",
        "project-workflow.md.tmpl": "references/project-workflow.md",
        "security-checklist.md.tmpl": "references/security-checklist.md",
        "replit-handoff-template.md.tmpl": "references/replit-handoff-template.md",
        "review-finding-template.md.tmpl": "references/review-finding-template.md",
    }
    written = []
    for tmpl, dest in mapping.items():
        src = TEMPLATES / tmpl
        if not src.is_file():
            fail(f"missing template: {src}")
        body = render(src.read_text(encoding="utf-8"), ctx)
        left = re.findall(r"\{\{[^}]*\}\}", body)
        if left:
            fail(f"unresolved placeholders in {dest}: {left[:3]}")
        target = out / dest
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(body, encoding="utf-8")
        written.append(str(target))
    print("Rendered:")
    for w in written:
        print("  " + w)
    print(f"Next: python3 scripts/validate_skill.py {out}")


if __name__ == "__main__":
    main()
