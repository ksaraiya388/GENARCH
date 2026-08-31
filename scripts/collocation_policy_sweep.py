import numpy as np
import pandas as pd

r = pd.read_csv("pipeline/sources/deq_regulatory_monitor_hourly.csv")
s = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")
r = r[r.site_id == "ashburn"]
s = s[s.site_id == "ashburn-collocated"]


def fit(sub):
    x = sub.value_sensor.to_numpy(float)
    y = sub.value_reg.to_numpy(float)
    if len(sub) < 30:
        return None
    b, a = np.polyfit(x, y, 1)
    pred = a + b * x
    r2 = 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return len(sub), a, b, r2


POLICIES = {
    "both excluded-flags applied": (True, True),
    "sensor flag only": (True, False),
    "regulatory flag only": (False, True),
    "no exclusions at all": (False, False),
}

TARGETS = {
    ("apex-14", "NO2"): (2.20, 1.065, 0.491),
    ("apex-05", "NO2"): (1.84, 0.316, 0.205),
    ("apex-14", "PM2.5"): (1.29, 0.832, 0.725),
    ("apex-05", "PM2.5"): (-4.66, 1.665, 0.837),
}

for label, (use_s, use_r) in POLICIES.items():
    ss = s[~s.excluded] if use_s else s
    rr = r[~r.excluded] if use_r else r
    for drop_zero in [False, True]:
        tag = f"{label}{' + drop sensor zeros' if drop_zero else ''}"
        s2 = ss[ss.value != 0] if drop_zero else ss
        m = s2[["ts_est", "pollutant", "value", "unit_id"]].merge(
            rr[["ts_est", "pollutant", "value"]],
            on=["ts_est", "pollutant"],
            suffixes=("_sensor", "_reg"),
        )
        m["ts_est"] = pd.to_datetime(m["ts_est"])
        print(f"\n--- {tag} ---")
        for (unit, pol), tgt in TARGETS.items():
            for cut in ["2026-08-07", "2026-08-10"]:
                sub = m[
                    (m.unit_id == unit)
                    & (m.pollutant == pol)
                    & (m.ts_est <= pd.Timestamp(cut) + pd.Timedelta("23:00:00"))
                ]
                res = fit(sub)
                if res is None:
                    continue
                n, a, b, r2 = res
                hit = (
                    abs(a - tgt[0]) < 0.02
                    and abs(b - tgt[1]) < 0.002
                    and abs(r2 - tgt[2]) < 0.002
                )
                mark = "  <== MATCHES STORED" if hit else ""
                print(
                    f"  {unit:8} {pol:6} {cut}  n={n:5d}  "
                    f"a={a:8.3f} b={b:7.4f} R2={r2:6.4f}"
                    f"   target {tgt}{mark}"
                )
