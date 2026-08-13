import csv, glob, os
import pandas as pd, numpy as np
pd.set_option("display.width", 220)

def load_kunak(path):
    txt = open(path, "rb").read().decode("utf-8-sig", errors="replace")
    rows = [r for r in csv.reader(txt.splitlines()[1:], delimiter=";") if r]
    df = pd.DataFrame(rows[1:], columns=rows[0]).drop_duplicates()
    df["ts_raw"] = pd.to_datetime(df["Date"], format="%b %d, %Y, %H:%M:%S", errors="coerce")
    for c in df.columns:
        if c not in ("Location", "Date", "ts_raw"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
    cut = pd.Timestamp("2026-03-08 03:00")
    df["ts"] = df["ts_raw"] - pd.to_timedelta(np.where(df["ts_raw"] < cut, 1, 2), unit="h")
    return df

def pmcol(df):
    m = [c for c in df.columns if c.startswith("PM2.5")]
    return m[0] if m else None

r = pd.read_excel("deq-regulatory/AshburnPM2.5_030326_081026.xls", sheet_name="Sheet1", engine="xlrd")
r["Flags"] = r["Flags"].fillna("").astype(str)
r["AQS Null Code"] = r["AQS Null Code"].fillna("").astype(str)
r["valid"] = r["Value"].notna() & (r["AQS Null Code"]=="") & ~r["Flags"].str.contains("<")
r["day"] = r["Date"].dt.date

print("### A. REGULATORY COVERAGE BY DAY")
d = r.groupby("day")["valid"].sum()
print("  total days:", len(d))
print("  days with 24 valid :", int((d==24).sum()))
print("  days with >=18     :", int((d>=18).sum()))
print("  days with 0 valid  :", int((d==0).sum()))
bad = d[d < 18]
print("\n  DAYS BELOW 18 VALID HOURS (%d):" % len(bad))
runs, start, prev = [], None, None
for day, n in bad.items():
    if start is None: start = day
    elif (day - prev).days > 1:
        runs.append((start, prev)); start = day
    prev = day
if start is not None: runs.append((start, prev))
for a, b in runs:
    span = (b-a).days + 1
    codes = r[(r["day"]>=a)&(r["day"]<=b)]["AQS Null Code"].replace("", np.nan).dropna().value_counts().to_dict()
    print("    %s -> %s  (%d days)  null codes: %s" % (a, b, span, codes))

print("\n### B. LONGEST CONTINUOUS VALID STRETCH")
v = r[r["valid"]].copy()
gap = v["Date"].diff() > pd.Timedelta(hours=1)
v["blk"] = gap.cumsum()
g = v.groupby("blk")["Date"].agg(["min","max","size"]).sort_values("size", ascending=False)
print(g.head(6).to_string())

print("\n### C. SENSOR VALUES, JULY 2-8")
for p in sorted(glob.glob("deq-raw/*.csv")):
    k = load_kunak(p); c = pmcol(k)
    if c is None: continue
    w = k[(k["ts"]>="2026-07-02")&(k["ts"]<"2026-07-09")]
    if len(w):
        i = w[c].idxmax()
        print("  %-46s max=%6.2f at %s  mean=%5.2f" % (os.path.basename(p), w[c].max(), w.loc[i,"ts"], w[c].mean()))

print("\n### D. NETWORK-WIDE HOURLY SYNCHRONY (non-smoke hours >35)")
frames = []
for p in sorted(glob.glob("deq-raw/*.csv")):
    if "_superseded" in p: continue
    k = load_kunak(p); c = pmcol(k)
    if c is None: continue
    site = os.path.basename(p).split("_")[0]
    frames.append(k[["ts", c]].rename(columns={c: site}).set_index("ts"))
wide = pd.concat(frames, axis=1).sort_index()
wide = wide.loc[:, ~wide.columns.duplicated()]
ns = wide[(wide.index < "2026-07-16") | (wide.index >= "2026-07-20")]
hot = ns[(ns > 35).any(axis=1)]
print("  non-smoke hours with any site >35:", len(hot))
print(hot.round(1).to_string())

print("\n### E. HOW MANY SITES ELEVATED SIMULTANEOUSLY")
cnt = (ns > 35).sum(axis=1)
print(cnt[cnt > 0].value_counts().sort_index().rename("hours").to_string())
print("\n  SMOKE WINDOW for contrast:")
sm = wide[(wide.index >= "2026-07-16") & (wide.index < "2026-07-20")]
cs = (sm > 35).sum(axis=1)
print(cs[cs > 0].value_counts().sort_index().rename("hours").to_string())

print("\n### F. CROSS-SITE CORRELATION (non-smoke, hourly)")
print(ns.corr().round(3).to_string())
