#!/usr/bin/env python3
"""Build a deterministic ZIP with the skill folder as the single top-level directory.

Usage:
  python3 scripts/build_zip.py SKILL_DIR --out DIST_DIR

Prints the ZIP path and SHA-256. Run validate_skill.py first.
"""
import argparse, hashlib, pathlib, sys, zipfile

JUNK = {".git", "node_modules", "__pycache__", ".DS_Store"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("skill_dir")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    d = pathlib.Path(a.skill_dir).resolve()
    if not (d / "SKILL.md").is_file():
        sys.exit("ERROR: SKILL.md not found")
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    z = out / f"{d.name}.zip"
    if z.exists():
        z.unlink()
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for p in sorted(d.rglob("*")):
            if set(p.relative_to(d).parts) & JUNK or not p.is_file():
                continue
            arc = f"{d.name}/{p.relative_to(d).as_posix()}"
            zi = zipfile.ZipInfo(arc, date_time=(2026, 1, 1, 0, 0, 0))
            zi.external_attr = (p.stat().st_mode & 0xFFFF) << 16
            zi.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(zi, p.read_bytes())
    h = hashlib.sha256(z.read_bytes()).hexdigest()
    print(f"ZIP: {z}\nSHA-256: {h}")
    print("Check: unzip -l", z)


if __name__ == "__main__":
    main()
