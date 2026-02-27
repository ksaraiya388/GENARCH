"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SearchResult = {
  href: string;
  label: string;
  summary: string;
  type: string;
  confidence?: string;
};

export function SiteSearch(): JSX.Element {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { results: SearchResult[] };
        setResults(payload.results);
      } finally {
        setLoading(false);
      }
    };
    const timeout = setTimeout(run, 200);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative w-full max-w-xl" ref={rootRef}>
      <label className="sr-only" htmlFor="site-search">
        Search diseases, exposures, genes, and pathways
      </label>
      <input
        id="site-search"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search disease, exposure, gene, pathway..."
        className="w-full rounded-card border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-action/40 focus:ring"
      />
      {open && (query.trim().length > 1 || loading) ? (
        <div className="absolute z-30 mt-2 max-h-96 w-full overflow-auto rounded-card border border-slate-200 bg-white shadow-soft">
          {loading ? <p className="p-3 text-sm text-textSecondary">Searching...</p> : null}
          {!loading && results.length === 0 ? (
            <p className="p-3 text-sm text-textSecondary">No matches found.</p>
          ) : null}
          {!loading &&
            results.map((result) => (
              <Link
                href={result.href}
                key={result.href}
                className="block border-b border-slate-100 px-3 py-3 last:border-b-0 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <p className="text-sm font-semibold text-textPrimary">
                  {result.label}{" "}
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">
                    {result.type}
                  </span>
                </p>
                <p className="line-clamp-2 text-xs text-textSecondary">{result.summary}</p>
              </Link>
            ))}
        </div>
      ) : null}
    </div>
  );
}
