import collections
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
S = Path(__file__).parent
lines = (S / "moj.txt").read_text(encoding="utf-8").splitlines()
rows = collections.Counter()
kinds = collections.Counter()
for ln in lines:
    if ln.startswith(("INFO:", "FAIL:", "OK:")) or not ln.strip():
        continue
    info = ln.startswith("INFO ")
    body = ln[5:] if info else ln
    m = re.match(r"^(.*?):(\d+):(.*)$", body)
    if not m:
        print("UNPARSED:", ln)
        continue
    f, _, snippet = m.groups()
    kind = "BOM" if "leading U+FEFF" in snippet else "pattern"
    sev = "INFO" if info else "FAIL"
    rows[(f, kind, sev)] += 1
    kinds[(kind, sev)] += 1

print(f"{'file':54s} {'kind':8s} {'sev':5s} {'hits':>5s}")
for (f, kind, sev), n in sorted(rows.items(), key=lambda kv: (kv[0][2], -kv[1], kv[0][0])):
    print(f"{f:54s} {kind:8s} {sev:5s} {n:5d}")
print()
for (kind, sev), n in sorted(kinds.items()):
    print(f"TOTAL {kind:8s} {sev:5s} {n}")
print("files failing:", len({f for (f, k, s) in rows if s == "FAIL"}))
print("files info   :", len({f for (f, k, s) in rows if s == "INFO"}))

# The two round-2 documents are untracked, so git ls-files does not reach them.
sys.path.insert(0, str(Path.cwd() / "scripts"))
import check_mojibake as cm  # noqa: E402

print()
for rel in ("docs/report-2026/CONTEXT.md", "docs/report-2026/DECISIONS.md",
            "docs/report-2026/AUDIT.md", "scripts/check_mojibake.py"):
    hits = cm.scan(Path.cwd() / rel)
    print(f"{rel:40s} {'OK: no hits' if not hits else hits}")
