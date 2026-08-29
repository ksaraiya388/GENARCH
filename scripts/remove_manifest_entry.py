import json
import sys
from pathlib import Path

target = sys.argv[1]
p = Path("pipeline/sources/manifest.json")
m = json.loads(p.read_text(encoding="utf-8"))

if isinstance(m, dict) and "sources" in m:
    bucket = m["sources"]
    kept = [e for e in bucket if e.get("filename") != target]
    m["sources"] = kept
elif isinstance(m, list):
    bucket = m
    kept = [e for e in bucket if e.get("filename") != target]
    m = kept
else:
    raise SystemExit(f"unrecognised manifest shape: {type(m)}")

p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"removed {len(bucket) - len(kept)} entry/entries for {target}")
