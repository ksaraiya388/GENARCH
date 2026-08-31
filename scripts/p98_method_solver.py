import numpy as np
import pandas as pd

DEQ = {
    "golf-course": 23.4, "belfort-park": 25.9, "ashburn-collocated": 24.8,
    "dulles-area": 17.8, "farmwell-middle": 24.6, "sterling-ms": 33.8,
}

d = pd.read_csv("pipeline/sources/deq_pm25_daily.csv")
d = d[
    d.meets_18_of_24
    & d.mean_pm25_ugm3.notna()
    & (d.instrument_class == "low_cost_sensor_kunak_apex")
]

TYPES = ["linear", "lower", "higher", "nearest", "midpoint"]

for cutoff in ["2026-08-26", "2026-08-27", "2026-08-28"]:
    print(f"\n===== cutoff {cutoff} =====")
    for slug, target in DEQ.items():
        v = np.sort(d[(d.site_id == slug) & (d.date_est <= cutoff)].mean_pm25_ugm3.to_numpy())
        n = len(v)
        if n < 10:
            continue
        out = [f"{slug:20} n={n:4d} DEQ={target:6.1f}"]
        for t in TYPES:
            q = np.quantile(v, 0.98, method=t)
            mark = " *" if abs(q - target) < 0.06 else "  "
            out.append(f"{t[:4]}={q:6.2f}{mark}")
        # EPA Appendix N: exclude floor(0.02n) highest, take next
        i = int(0.02 * n)
        epa = v[n - 1 - i]
        out.append(f"EPA={epa:6.2f}{' *' if abs(epa - target) < 0.06 else '  '}")
        # R types 4 and 6
        for rt, h in (("R6", 0.98 * (n + 1)), ("R4", 0.98 * n)):
            if 1 <= h <= n:
                lo = int(np.floor(h))
                frac = h - lo
                val = v[lo - 1] + frac * (v[min(lo, n - 1)] - v[lo - 1])
                out.append(f"{rt}={val:6.2f}{' *' if abs(val - target) < 0.06 else '  '}")
        print("  ".join(out))
