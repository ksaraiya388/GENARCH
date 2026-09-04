import math
import pandas as pd

DEQ_T1 = {
    "golf-course": 0.1, "belfort-park": 0.1, "ashburn-collocated": 0.1,
    "dulles-area": 0.1, "farmwell-middle": 0.1, "sterling-ms": 0.1,
}

h = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")
h = h[(h.pollutant == "CO") & (~h.excluded)].copy()
h["ts_est"] = pd.to_datetime(h.ts_est)
h = h[h.ts_est <= "2026-08-27 23:00:00"]

print(f"{'site':20} {'raw':>8} {'round':>7} {'trunc':>7} {'DEQ':>6}  match")
for slug, deq in DEQ_T1.items():
    v = h[h.site_id == slug].value
    if v.empty:
        continue
    m = v.mean()
    rnd = round(m, 1)
    trunc = math.floor(m * 10) / 10
    hit = "TRUNC" if abs(trunc - deq) < 1e-9 else ("ROUND" if abs(rnd - deq) < 1e-9 else "neither")
    print(f"{slug:20} {m:8.4f} {rnd:7.1f} {trunc:7.1f} {deq:6.1f}  {hit}")
