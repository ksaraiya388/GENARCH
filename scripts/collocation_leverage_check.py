import numpy as np
import pandas as pd

r = pd.read_csv("pipeline/sources/deq_regulatory_monitor_hourly.csv")
s = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")
r = r[(r.site_id == "ashburn") & (~r.excluded)].copy()
s = s[(s.site_id == "ashburn-collocated") & (~s.excluded)].copy()
for d in (r, s):
    d["ts"] = pd.to_datetime(d["ts_est"])

SPLIT = pd.Timestamp("2026-04-08")
m = s[["ts", "pollutant", "value", "unit_id"]].merge(
    r[["ts", "pollutant", "value"]], on=["ts", "pollutant"], suffixes=("_sensor", "_reg")
)
m = m[m.pollutant == "NO2"]

by_unit = m[m.unit_id == "apex-14"]
by_date = m[m.ts < SPLIT]

only_unit = by_unit[~by_unit.ts.isin(by_date.ts)]
only_date = by_date[~by_date.ts.isin(by_unit.ts)]

print(f"unit_id n={len(by_unit)}  date_window n={len(by_date)}")
print("\nrows in unit_id selection but NOT in date window:")
print(only_unit.to_string(index=False) if len(only_unit) else "  none")
print("\nrows in date window but NOT in unit_id selection:")
print(only_date.to_string(index=False) if len(only_date) else "  none")

x = by_date.value_sensor.to_numpy(float)
y = by_date.value_reg.to_numpy(float)
b, a = np.polyfit(x, y, 1)
resid = y - (a + b * x)
lev = (x - x.mean()) ** 2 / ((x - x.mean()) ** 2).sum() + 1 / len(x)
by_date = by_date.assign(residual=resid, leverage=lev)

print("\ntop 8 by leverage (date-window fit):")
print(
    by_date.nlargest(8, "leverage")[
        ["ts", "value_sensor", "value_reg", "residual", "leverage"]
    ].to_string(index=False)
)
print("\nleave-one-out R2 range:")
r2s = []
for i in range(len(x)):
    xi = np.delete(x, i)
    yi = np.delete(y, i)
    bb, aa = np.polyfit(xi, yi, 1)
    p = aa + bb * xi
    r2s.append(1 - ((yi - p) ** 2).sum() / ((yi - yi.mean()) ** 2).sum())
r2s = np.array(r2s)
print(f"  full-sample R2 {1 - (resid**2).sum() / ((y - y.mean())**2).sum():.4f}")
print(f"  LOO min {r2s.min():.4f}  max {r2s.max():.4f}  spread {r2s.max()-r2s.min():.4f}")
print(f"  worst single point: index {r2s.argmax()}, ts {by_date.iloc[r2s.argmax()].ts}")
