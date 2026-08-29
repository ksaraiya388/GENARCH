import json
import sys
from pathlib import Path

p = Path(sys.argv[1])
tables = json.loads(p.read_text(encoding="utf-8"))
want = {int(x) for x in sys.argv[2:]} if len(sys.argv) > 2 else None

for t in tables:
    if want and t["page"] not in want:
        continue
    print(f"\n===== PAGE {t['page']} TABLE {t['table_index']} =====")
    for row in t["rows"]:
        print(" | ".join(row))
