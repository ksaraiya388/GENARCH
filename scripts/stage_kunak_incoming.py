import shutil
import sys
from datetime import date
from pathlib import Path

SRC = Path(sys.argv[1])
START, END = "2026-03-03", "2026-10-10"
DEST = Path("pipeline/sources/deq-raw")
SUPERSEDED = DEST / "_superseded"

# Kunak writes its Date column as "Oct 10, 2026, 23:00:00", with no zero padding
# on the day. Both literals are derived from END: a hardcoded date survives a
# change of export window and then reports the wrong newest hour as correct.
_END_DATE = date.fromisoformat(END)
END_STAMP = f"{_END_DATE:%b} {_END_DATE.day}, {_END_DATE.year}"
END_SUFFIX = f"_{END}.csv"

LOCS = {
    "Broad Run HS": "ashburn-collocated",
    "Belfort Park Dr": "belfort-park",
    "Dulles Airport": "dulles-area",
    "Farmwell Station MS": "farmwell-middle",
    "1757 Golf Club": "golf-course",
    "Camp William B Snyder": "camp-snyder",
    "Evergreen Country Club": "evergreen-cc",
    "VDOT MKC": "vdot-mkc",
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


def retire_prior_end():
    """Move every root export whose END is not the current one into _superseded.

    Every target name is checked before anything moves. A half-finished retirement
    leaves the root holding two files for one site, which is the state
    reshape_deq.py refuses to parse -- and the state 782c1dc shipped, with the
    2026-10-04 and 2026-10-10 sets both in the root and only the later one read.
    """
    stale = sorted(p for p in DEST.glob("*.csv") if not p.name.endswith(END_SUFFIX))
    if not stale:
        print("\nno prior-END files in the root")
        return
    SUPERSEDED.mkdir(parents=True, exist_ok=True)
    clashes = [p.name for p in stale if (SUPERSEDED / p.name).exists()]
    if clashes:
        print("\nABORTING before any move; already in _superseded:")
        for name in clashes:
            print(f"    {name}")
        sys.exit(1)
    print()
    for p in stale:
        shutil.move(str(p), str(SUPERSEDED / p.name))
        print(f"retired -> {(SUPERSEDED / p.name).as_posix()}")


plan, seen, unmapped = [], set(), []
for p in sorted(SRC.glob("*.csv")):
    loc, info = probe(p)
    if info is None:
        print(f"SKIPPED, not a Kunak export: {p.name}")
        continue
    if loc not in LOCS:
        # Skipping these silently is how a renamed dashboard location drops a site
        # out of the staged set with nothing in the output to show for it.
        print(f"UNMAPPED LOCATION: {loc} ({p.name})")
        unmapped.append(loc)
        continue
    n, newest, oldest = info
    slug = LOCS[loc]
    if slug in seen:
        print(f"DUPLICATE SOURCE for {loc}: {p}")
        continue
    seen.add(slug)
    target = DEST / f"{slug}_multi_{START}_{END}.csv"
    plan.append((p, target))
    flag = "" if END_STAMP in newest else f"   <-- newest is not {END_STAMP}"
    print(f"{loc:22} rows={n:6d}  {oldest}  ..  {newest}{flag}")
    print(f"    {p.name}  ->  {target.as_posix()}")

missing = set(LOCS.values()) - seen
if missing:
    print("\nMISSING SITES: " + ", ".join(sorted(missing)))
if unmapped:
    print("\nUNMAPPED LOCATIONS: " + ", ".join(sorted(unmapped)))

if "--go" in sys.argv and not missing and not unmapped:
    for src, target in plan:
        if target.exists():
            print(f"SKIP exists: {target}")
            continue
        shutil.copy2(src, target)
        print(f"copied -> {target}")
    retire_prior_end()
elif "--go" in sys.argv:
    blockers = []
    if missing:
        blockers.append("sites missing")
    if unmapped:
        blockers.append("unmapped locations")
    print("refusing to copy with " + " and ".join(blockers))
else:
    print("\nDry run. Add --go to copy.")




