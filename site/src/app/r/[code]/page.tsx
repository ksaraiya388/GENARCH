import type { Metadata } from "next";
import Link from "next/link";
import { OutreachRedirect } from "./OutreachRedirect";

/**
 * Outreach attribution redirects. Every code lands on the same page; the code exists
 * only so the send it came from is identifiable in Vercel Analytics as a distinct path.
 *
 * One code per recipient, never reused — see docs/GENARCH_RULES.md §11. Adding a code
 * here is the whole of the work; the route is otherwise generic.
 */
const OUTREACH_CODES = [
  "deq",
  "pec",
  "lcp",
  "mcaf",
  "dcrc",
  "loudounnow",
  "eenews",
  "lchd",
  "gmu",
  "dip",
  "muckrock",
] as const;

/** trailingSlash: true in next.config.js — the target keeps its slash to avoid a second hop. */
const REDIRECT_TARGET = "/community/data-center-alley/";

const REDIRECT_TARGET_LABEL = "Data Center Corridor Air Monitoring";

// Static export: only the codes above are built, and an unknown code 404s at the CDN
// rather than rendering an empty redirect shell.
export const dynamicParams = false;

export async function generateStaticParams() {
  return OUTREACH_CODES.map((code) => ({ code }));
}


export const metadata: Metadata = {
  title: "Redirecting — GENARCH",
  // These paths are an attribution mechanism, not content. Indexing them would put ten
  // duplicate entry points to one page into search results and leak the recipient list.
  robots: { index: false },
};

export default async function OutreachRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-xl space-y-4">
        <h1 className="text-h2 text-surface-white">Redirecting…</h1>
        <p className="text-cool-light">
          Taking you to <span className="text-surface-white">{REDIRECT_TARGET_LABEL}</span>.
        </p>
        {/* Fallback: this link is the whole page when JavaScript is disabled. */}
        <p className="text-cool-light">
          If you are not redirected,{" "}
          <Link href={REDIRECT_TARGET} className="text-teal-primary underline">
            continue to {REDIRECT_TARGET_LABEL}
          </Link>
          .
        </p>
        <p className="text-sm text-cool-mid">Link reference: {code}</p>
      </div>
      <OutreachRedirect target={REDIRECT_TARGET} />
    </div>
  );
}
