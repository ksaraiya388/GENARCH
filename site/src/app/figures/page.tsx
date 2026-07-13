import Link from "next/link";
import type { Metadata } from "next";
import { FIGURES, SHIPPED_FIGURE_IDS } from "@/lib/figures";

export const metadata: Metadata = {
  title: "Figure exports (internal)",
  robots: { index: false, follow: false },
};

export default function FiguresIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-surface-white">
      <h1 className="text-h1 mb-2">Figure exports</h1>
      <p className="text-cool-mid mb-8">
        Internal production assets for social cards. These pages are not indexed
        and are captured by the figure export script.
      </p>
      <ul className="space-y-6">
        {SHIPPED_FIGURE_IDS.map((id) => {
          const m = FIGURES[id];
          if (!m) return null;
          return (
            <li key={id} className="border border-white/10 rounded-md p-4">
              <div className="font-semibold text-surface-white">{m.title}</div>
              <div className="text-sm text-cool-light mt-1">{m.claim}</div>
              <div className="text-sm text-cool-mid mt-1">drives to {m.destination}</div>
              <div className="mt-3 space-x-4 text-sm">
                <Link className="text-teal-primary" href={`/figures/${id}/?size=card`}>
                  card 1200×675
                </Link>
                <Link className="text-teal-primary" href={`/figures/${id}/?size=square`}>
                  square 1080×1080
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
