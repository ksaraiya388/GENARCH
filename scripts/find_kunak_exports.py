from pathlib import Path

LOCS = {
    "Broad Run HS": "ashburn-collocated",
    "Belfort Park Dr": "belfort-park",
    "Dulles Airport": "dulles-area",
    "Farmwell Station MS": "farmwell-middle",
    "1757 Golf Club": "golf-course",
    "Sterling MS": "sterling-ms",
}
EXISTING = {p.resolve() for p in Path("pipeline/sources/deq-raw").glob("*.csv")}


def probe(p):
    try:
        with open(p, encoding="utf-8-sig", errors="replace") as fh:
            head = fh.read(400)
            if "sep=;" not in head or "PM2.5" not in head:
                return None
            fh.seek(0)
            for line in fh:
                if line.startswith("sep=") or line.lstrip().startswith('"Location"'):
                    continue
                if ";" in line:
                    return line.split(";")[0].strip().strip('"')
    except Exception:
        return None
    return None


home = Path.home()
skip = {"AppData", "node_modules", ".git", "Windows", "Program Files"}
hits = []
for p in home.rglob("*.csv"):
    if any(s in p.parts for s in skip):
        continue
    if p.resolve() in EXISTING:
        continue
    loc = probe(p)
    if loc in LOCS:
        n = sum(1 for _ in open(p, encoding="utf-8-sig", errors="replace"))
        hits.append((loc, p, n))

if hits:
    print("KUNAK EXPORTS FOUND OUTSIDE THE REPO")
    for loc, p, n in sorted(hits):
        print(f"  {loc:22} lines={n:6d}  {p}")
    print("\nfolders:")
    for d in sorted({str(p.parent) for _, p, _ in hits}):
        print(f"  {d}")
else:
    print("No Kunak exports found under", home)
