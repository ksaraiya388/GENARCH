import numpy as np
import pandas as pd

r = pd.read_csv("pipeline/sources/deq_regulatory_monitor_hourly.csv")
s = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")

r = r[(r.site_id == "ashburn") & (~r.excluded)].copy()
s = s[s.site_id == "ashburn-collocated"].copy()
s["exclusion_reason"] = s["exclusion_reason"].fillna("")
for d in (r, s):
    d["ts_est_p"] = pd.to_datetime(d["ts_est"])
    d["ts_raw_p"] = pd.to_datetime(d["ts_raw"])

SPLIT = pd.Timestamp("2026-04-08")
CUT = pd.Timestamp("2026-08-07 23:00:00")

TARGETS = {
    ("apex-14", "NO2"): (2.20, 1.065, 0.491),
    ("apex-05", "NO2"): (1.84, 0.316, 0.205),
    ("apex-14", "PM2.5"): (1.29, 0.832, 0.725),
    ("apex-05", "PM2.5"): (-4.66, 1.665, 0.837),
}

SENSOR_POLICIES = {
    "A excluded-flag": lambda d: d[~d.excluded],
    "B void dropped, zeros kept": lambda d: d[~d.exclusion_reason.str.contains("void")],
    "C nothing dropped": lambda d: d,
}


def fit(sub):
    if len(sub) < 30:
        return None
    x = sub.value_sensor.to_numpy(float)
    y = sub.value_reg.to_numpy(float)
    if np.isnan(x).any() or np.isnan(y).any():
        return None
    b, a = np.polyfit(x, y, 1)
    pred = a + b * x
    return len(sub), a, b, 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()


for ts in ["ts_est", "ts_raw"]:
    col = ts + "_p"
    for sel in ["unit_id", "date_window"]:
        for pname, pfn in SENSOR_POLICIES.items():
            s2 = pfn(s)
            m = s2[[col, "pollutant", "value", "unit_id"]].merge(
                r[[col, "pollutant", "value"]],
                on=[col, "pollutant"],
                suffixes=("_sensor", "_reg"),
            )
            print(f"\n--- ts={ts} | select={sel} | sensor={pname} ---")
            for (unit, pol), tgt in TARGETS.items():
                sub = m[m.pollutant == pol]
                if sel == "unit_id":
                    sub = sub[sub.unit_id == unit]
                else:
                    sub = (
                        sub[sub[col] < SPLIT]
                        if unit == "apex-14"
                        else sub[(sub[col] >= SPLIT) & (sub[col] <= CUT)]
                    )
                res = fit(sub)
                if res is None:
                    print(f"  {unit:8} {pol:6} n/a")
                    continue
                n, a, b, r2 = res
                hit = (
                    abs(a - tgt[0]) < 0.02
                    and abs(b - tgt[1]) < 0.002
                    and abs(r2 - tgt[2]) < 0.002
                )
                print(
                    f"  {unit:8} {pol:6} n={n:5d} a={a:8.3f} b={b:7.4f} "
                    f"R2={r2:6.4f}  target {tgt}{'  <== MATCH' if hit else ''}"
                )
