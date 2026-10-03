#!/usr/bin/env python3
"""Validate a skill folder for Claude.ai and Claude Code upload.

Usage:
  python3 scripts/validate_skill.py SKILL_DIR [--desc-limit 200] [--allow-placeholders] [--strict]

Checks: SKILL.md present; frontmatter name equals folder name; name format and reserved words;
description present and within the limit; no XML-like tags in the description; links and referenced
files resolve; no absolute local paths; no likely secrets; no .git, node_modules, caches, symlinks;
binary files listed; unresolved {{placeholders}} (unless allowed); em dashes (error with --strict).
Standard library only. Exit code 1 if any error.
"""
import argparse, pathlib, re, sys

JUNK_DIRS = {".git", "node_modules", "__pycache__", ".venv", ".idea", ".vscode"}
JUNK_FILES = {".DS_Store", "Thumbs.db"}
TEXT_EXT = {".md", ".txt", ".json", ".py", ".js", ".cjs", ".mjs", ".html", ".css", ".svg", ".yaml", ".yml", ".sh", ".tmpl", ".toml", ""}
SECRETS = [
    (r"AKIA[0-9A-Z]{16}", "aws key"), (r"gh[pousr]_[A-Za-z0-9]{30,}", "github token"),
    (r"sk-[A-Za-z0-9]{20,}", "api key"), (r"xox[abprs]-[A-Za-z0-9-]{10,}", "slack token"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "private key"),
    (r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][A-Za-z0-9/+_\-]{16,}['\"]", "assigned credential"),
    (r"eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}", "jwt"),
]
ABS = re.compile(r"(/home/[a-z][a-z0-9_-]*/|/Users/[A-Za-z]|/ro" r"ot/|C:\\Users|/tm" r"p/)")  # split so this file does not match itself
LINK = re.compile(r"\]\(([^)\s]+)\)")
BTICK = re.compile(r"`((?:references|scripts|assets|templates|examples)/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)`")
PLACEHOLDER = re.compile(r"\{\{[^}]*\}\}")


def frontmatter(text):
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    fm, cur = {}, None
    for line in m.group(1).splitlines():
        km = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if km:
            cur = km.group(1)
            v = km.group(2).strip()
            fm[cur] = "" if v in (">", "|", ">-", "|-") else v
            if len(fm[cur]) >= 2 and fm[cur][0] == fm[cur][-1] and fm[cur][0] in "\"'":
                fm[cur] = fm[cur][1:-1]
        elif cur and line[:1] in " \t":
            fm[cur] = (fm[cur] + " " + line.strip()).strip()
    return fm


def validate(d, desc_limit, allow_ph, strict):
    errs, warns = [], []
    d = pathlib.Path(d).resolve()
    if not d.is_dir():
        return [f"not a directory: {d}"], warns
    sk = d / "SKILL.md"
    if not sk.is_file():
        return ["SKILL.md missing"], warns
    fm = frontmatter(sk.read_text(encoding="utf-8"))
    if fm is None:
        errs.append("frontmatter missing or invalid")
    else:
        name, desc = fm.get("name", ""), fm.get("description", "")
        if name != d.name:
            errs.append(f"name {name!r} does not match folder {d.name!r}")
        if not re.fullmatch(r"[a-z0-9-]{1,64}", name):
            errs.append("name must be lowercase letters, numbers, hyphens, 64 or fewer")
        if re.search(r"anthropic|claude", name):
            errs.append("name contains a reserved word")
        if not desc:
            errs.append("description is empty")
        if len(desc) > desc_limit:
            errs.append(f"description is {len(desc)} characters, limit {desc_limit}")
        if re.search(r"<[A-Za-z/][^>]*>", desc):
            errs.append("description contains an XML-like tag")
    files = []
    for p in sorted(d.rglob("*")):
        rel = p.relative_to(d)
        if set(rel.parts) & JUNK_DIRS or p.name in JUNK_FILES:
            errs.append(f"junk path: {rel}")
        elif p.is_symlink():
            errs.append(f"symlink: {rel}")
        elif p.is_file():
            files.append(p)
    for p in files:
        rel = p.relative_to(d)
        data = p.read_bytes()
        if p.suffix.lower() not in TEXT_EXT or b"\x00" in data[:4096]:
            warns.append(f"binary file: {rel}")
            continue
        t = data.decode("utf-8", errors="replace")
        for pat, label in SECRETS:
            if re.search(pat, t):
                errs.append(f"possible secret ({label}) in {rel}")
        m = ABS.search(t)
        if m:
            errs.append(f"absolute local path in {rel}: {m.group(0)}")
        if not allow_ph and PLACEHOLDER.search(t):
            errs.append(f"unresolved placeholder in {rel}: {PLACEHOLDER.search(t).group(0)}")
        if "\u2014" in t:
            (errs if strict else warns).append(f"em dash in {rel}")
        if p.suffix.lower() == ".md":
            for target in LINK.findall(t) + BTICK.findall(t):
                if re.match(r"^(https?:|mailto:|#|data:)", target):
                    continue
                tp = target.split("#")[0]
                if tp and not ((p.parent / tp).exists() or (d / tp).exists()):
                    errs.append(f"unresolved reference in {rel}: {target}")
    print(f"files={len(files)} bytes={sum(p.stat().st_size for p in files)}")
    return errs, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("skill_dir")
    ap.add_argument("--desc-limit", type=int, default=200)
    ap.add_argument("--allow-placeholders", action="store_true")
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args()
    errs, warns = validate(a.skill_dir, a.desc_limit, a.allow_placeholders, a.strict)
    for w in warns:
        print("warn :", w)
    for e in errs:
        print("ERROR:", e)
    print("RESULT:", "FAIL" if errs else "PASS")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
