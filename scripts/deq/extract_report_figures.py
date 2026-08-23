import pdfplumber, glob, os, io
out = io.open("report_diff_output.txt", "w", encoding="utf-8")
def w(s): out.write(s + "\n")
KEYS = ["R2 =", "R\u00b2 =", "98th percentile", "y =", "Sterling", "voided"]
for p in sorted(glob.glob("docs/deq-reports/*.pdf")):
    w("=" * 70); w(os.path.basename(p))
    with pdfplumber.open(p) as pdf:
        w("  pages: %d" % len(pdf.pages))
        for i, page in enumerate(pdf.pages):
            t = page.extract_text() or ""
            hits = [k for k in KEYS if k in t]
            if not hits: continue
            w("  --- page %d  hits: %s" % (i + 1, hits))
            for line in t.splitlines():
                if any(k in line for k in hits):
                    w("      " + line.strip())
out.close(); print("done")
