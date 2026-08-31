import numpy as np
import pandas as pd

r = pd.read_csv("pipeline/sources/deq_regulatory_monitor_hourly.csv")
s = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")

r = r[(r.site_id == "ashburn") & (~r.excluded)][["ts_est", "pollutant", "value"]]
s = s[(s.site_id == "ashburn-collocated") & (~s.excluded)][
    ["ts_est", "pollutant", "value", "unit_id"]
]

m = s.merge(r, on=["ts_est", "pollutant"], suffixes=("_sensor", "_reg"))
m["ts_est"] = pd.to_datetime(m["ts_est"])

CUTOFFS = ["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-10"]

print(f"{'unit':8} {'pol':6} {'cutoff':12} {'n':>5} {'intercept':>10} {'slope':>8} {'R2':>7}")
print("-" * 60)
for unit in sorted(m.unit_id.dropna().unique()):
    for pol in ["NO2", "PM2.5"]:
        sub_all = m[(m.unit_id == unit) & (m.pollutant == pol)]
        if sub_all.empty:
            continue
        for cut in CUTOFFS:
            sub = sub_all[sub_all.ts_est <= pd.Timestamp(cut) + pd.Timedelta("23:00:00")]
            if len(sub) < 30:
                continue
            x = sub.value_sensor.to_numpy(float)
            y = sub.value_reg.to_numpy(float)
            b, a = np.polyfit(x, y, 1)
            pred = a + b * x
            r2 = 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
            print(f"{unit:8} {pol:6} {cut:12} {len(sub):5d} {a:10.3f} {b:8.4f} {r2:7.4f}")
        print()

print("DEQ published 2026-08-28 (data through 2026-08-27):")
print("  NO2   APEX 14  y = 2.2  + 1.1  x   R2 = 0.49   [closed window]")
print("  NO2   APEX 5   y = 1.7  + 0.31 x   R2 = 0.21   [open]")
print("  PM2.5 APEX 14  y = 1.3  + 0.83 x   R2 = 0.73   [closed window]")
print("  PM2.5 APEX 5   y = -5   + 1.6  x   R2 = 0.82   [open]")
print()
print("DEQ published 2026-08-07 (from notes, unverified against an archived PDF):")
print("  NO2   APEX 5   y = 1.9  + 0.29 x   R2 = 0.17")
