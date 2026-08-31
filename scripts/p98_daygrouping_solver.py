import numpy as np
import pandas as pd

DEQ = {
    "golf-course": 23.4, "belfort-park": 25.9, "ashburn-collocated": 24.8,
    "dulles-area": 17.8, "farmwell-middle": 24.6, "sterling-ms": 33.8,
}
DEQ_MEAN = {
    "golf-course": 7.6, "belfort-park": 9.3, "ashburn-collocated": 8.3,
    "dulles-area": 5.8, "farmwell-middle": 8.2, "sterling-ms": 10.5,
}

h = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")
h = h[(h.pollutant == "PM2.5") & (~h.excluded)].copy()
h["ts_est"] = pd.to_datetime(h.ts_est)
h["ts_raw"] = pd.to_datetime(h.ts_raw)
h["shift_hours"] = h.shift_hours.fillna(0).astype(int)

h["d_est"] = h.ts_est.dt.date
h["d_raw"] = h.ts_raw.dt.date
h["d_raw_begin"] = (h.ts_raw - pd.Timedelta(hours=1)).dt.date
h["d_local_begin"] = (h.ts_raw - h.shift_hours.map(pd.Timedelta, unit="h")).dt.date

GROUPS = ["d_est", "d_raw", "d_raw_begin", "d_local_begin"]
CUT = pd.Timestamp("2026-08-27").date()

for g in GROUPS:
    print(f"\n===== grouping by {g} =====")
    sub = h[h[g] <= CUT]
    agg = sub.groupby(["site_id", g]).value.agg(["mean", "count"]).reset_index()
    agg = agg[agg["count"] >= 18]
    print(f"{'site':20} {'n':>4} {'mean':>7} {'dMean':>7} {'p98':>7} {'DEQ':>7} {'delta':>7}")
    for slug, target in DEQ.items():
        v = np.sort(agg[agg.site_id == slug]["mean"].to_numpy())
        if len(v) < 10:
            continue
        p = np.quantile(v, 0.98, method="linear")
        mk = " *" if abs(p - target) < 0.06 else ""
        print(
            f"{slug:20} {len(v):4d} {v.mean():7.2f} "
            f"{v.mean() - DEQ_MEAN[slug]:+7.2f} {p:7.2f} {target:7.1f} {p - target:+7.2f}{mk}"
        )
