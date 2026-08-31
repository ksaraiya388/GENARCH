import pandas as pd

DEQ_T4 = {
    "1757 Golf Club":       (7.6, 9.3, 5.4, 23.4),
    "Belfort Park Dr":      (9.3, 10.3, 7.3, 25.9),
    "Broad Run HS":         (8.3, 8.3, 6.8, 24.8),
    "Dulles Airport":       (5.8, 7.0, 4.1, 17.8),
    "Farmwell Station MS":  (8.2, 10.3, 6.1, 24.6),
    "Sterling MS":         (10.5, 12.0, 8.4, 33.8),
}
SLUG = {
    "golf-course": "1757 Golf Club",
    "belfort-park": "Belfort Park Dr",
    "ashburn-collocated": "Broad Run HS",
    "dulles-area": "Dulles Airport",
    "farmwell-middle": "Farmwell Station MS",
    "sterling-ms": "Sterling MS",
}

d = pd.read_csv("pipeline/sources/deq_pm25_daily.csv")
d = d[
    d.meets_18_of_24
    & d.mean_pm25_ugm3.notna()
    & (d.instrument_class == "low_cost_sensor_kunak_apex")
    & (d.date_est <= "2026-08-27")
]

hdr = f"{'site':22} {'stat':6} {'GENARCH':>9} {'DEQ':>7} {'delta':>7}"
print(hdr)
print("-" * len(hdr))
for slug, name in SLUG.items():
    v = d[d.site_id == slug].mean_pm25_ugm3
    if v.empty:
        print(f"{name:22} no rows")
        continue
    dm, dsd, dmed, dp98 = DEQ_T4[name]
    got = [
        ("mean", v.mean(), dm),
        ("sd", v.std(ddof=1), dsd),
        ("median", v.median(), dmed),
        ("p98", v.quantile(0.98), dp98),
    ]
    for stat, mine, theirs in got:
        print(f"{name:22} {stat:6} {mine:9.2f} {theirs:7.1f} {mine - theirs:+7.2f}")
    print(f"{'':22} n={len(v)}  max={v.max():.1f}  top5={sorted(v)[-5:]}")
    print()
