import json
from datetime import date
from pathlib import Path

mp = Path("pipeline/sources/manifest.json")
m = json.loads(mp.read_text(encoding="utf-8"))
bucket = m["sources"] if isinstance(m, dict) and "sources" in m else m
if not isinstance(bucket, list):
    raise SystemExit(f"unrecognised manifest shape: {type(m)}")

moved = 0
for e in bucket:
    fn = e.get("filename", "")
    if "deq-raw/" in fn and "_2026-08-10.csv" in fn and "_superseded/" not in fn:
        old = fn
        e["filename"] = fn.replace("deq-raw/", "deq-raw/_superseded/")
        e["superseded_on"] = date.today().isoformat()
        e["superseded_by"] = fn.replace("_2026-08-10.csv", "_2026-08-28.csv")
        e["superseded_reason"] = (
            "Replaced by a full re-pull covering 2026-03-03 to 2026-08-28. "
            "Retained unmodified for provenance; reshape_deq globs deq-raw/ "
            "non-recursively so files under _superseded/ are not ingested."
        )
        print(f"marked superseded: {old}")
        moved += 1

mp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{moved} entries updated")
