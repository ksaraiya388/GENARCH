import shutil
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
START, END = "2026-03-03", "2026-09-11"
DEST = Path("pipeline/sources/deq-raw")

LOCS = {
    "Broad Run HS": "ashburn-collocated",
    "Belfort Park Dr": "belfort-park",
    "Dulles Airport": "dulles-area",
    "Farmwell Station MS": "farmwell-middle",
    "1757 Golf Club": "golf-course",
    "Sterling MS": "sterling-ms",

    "Heritage Farm Museum": "heritage-farm",

    "Newberry Condo Assoc": "newberry-condo",

    "Steuart Weller ES": "steuart-weller",
}


def probe(p):
    with open(p, encoding="utf-8-sig", errors="replace") as fh:
        head = fh.read(400)
        if "sep=;" not in head or "PM2.5" not in head:
            return None, None
        fh.seek(0)
        rows = [
            ln
            for ln in fh
            if ln.strip()
            and not ln.startswith("sep=")
            and not ln.lstrip().startswith('"Location"')
        ]
    if not rows:
        return None, None
    parts_first = rows[0].split(";")
    parts_last = rows[-1].split(";")
    return parts_first[0].strip().strip('"'), (
        len(rows),
        parts_first[1].strip().strip('"'),
        parts_last[1].strip().strip('"'),
    )


plan, seen = [], set()
for p in sorted(SRC.glob("*.csv")):
    loc, info = probe(p)
    if loc not in LOCS:
        continue
    n, newest, oldest = info
    slug = LOCS[loc]
    if slug in seen:
        print(f"DUPLICATE SOURCE for {loc}: {p}")
        continue
    seen.add(slug)
    target = DEST / f"{slug}_multi_{START}_{END}.csv"
    plan.append((p, target))
    flag = "" if "Sep 11, 2026" in newest else "   <-- newest is not Sep 11"
    print(f"{loc:22} rows={n:6d}  {oldest}  ..  {newest}{flag}")
    print(f"    {p.name}  ->  {target.as_posix()}")

missing = set(LOCS.values()) - seen
if missing:
    print("\nMISSING SITES: " + ", ".join(sorted(missing)))

if "--go" in sys.argv and not missing:
    for src, target in plan:
        if target.exists():
            print(f"SKIP exists: {target}")
            continue
        shutil.copy2(src, target)
        print(f"copied -> {target}")
elif "--go" in sys.argv:
    print("refusing to copy with sites missing")
else:
    print("\nDry run. Add --go to copy.")



