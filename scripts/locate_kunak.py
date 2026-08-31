import os
import sys
from pathlib import Path

TARGETS = [
    "Broad_Run_HS.csv",
    "Dulles_Airport.csv",
    "1757_Golf_Club.csv",
    "Farmwell_Station_MS.csv",
    "Belfort_Park_Dr.csv",
    "Sterling_MS.csv",
]


def is_kunak(p):
    try:
        with open(p, encoding="utf-8-sig", errors="replace") as fh:
            head = fh.read(400)
        return "sep=;" in head and "Location" in head and "PM2.5" in head
    except Exception:
        return False


def location_of(p):
    try:
        with open(p, encoding="utf-8-sig", errors="replace") as fh:
            for line in fh:
                if line.startswith("sep=") or line.lstrip().startswith('"Location"'):
                    continue
                if ";" in line:
                    return line.split(";")[0].strip().strip('"')
    except Exception:
        pass
    return None


print("=== KUNAK-FORMAT FILES ALREADY IN THE REPO ===")
found_repo = False
for p in sorted(Path("pipeline").rglob("*.csv")):
    if is_kunak(p):
        found_repo = True
        n = sum(1 for _ in open(p, encoding="utf-8-sig", errors="replace"))
        print(f"  {p.as_posix():60} loc='{location_of(p)}'  lines={n}")
if not found_repo:
    print("  none")

print("\n=== DIRECTORY TREE UNDER pipeline/sources ===")
for root, dirs, files in os.walk("pipeline/sources"):
    dirs[:] = [d for d in dirs if d not in {".git", "__pycache__"}]
    depth = root.replace("\\", "/").count("/")
    print("  " * depth + Path(root).name + "/")
    for f in sorted(files)[:14]:
        print("  " * (depth + 1) + f)
    if len(files) > 14:
        print("  " * (depth + 1) + f"... {len(files) - 14} more")

print("\n=== SEARCHING FOR THE NEW EXPORTS ===")
roots = [Path.home() / "Downloads", Path.home() / "Desktop", Path.home() / "Documents", Path.cwd()]
hits = {}
for r in roots:
    if not r.exists():
        continue
    for p in r.rglob("*.csv"):
        if p.name in TARGETS:
            hits.setdefault(p.name, []).append(p)
for t in TARGETS:
    if t in hits:
        for p in hits[t]:
            print(f"  FOUND {t:26} -> {p}")
    else:
        print(f"  NOT FOUND {t}")
