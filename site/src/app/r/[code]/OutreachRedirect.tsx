"use client";

import { useEffect } from "react";

/**
 * The redirect is deliberately deferred rather than fired on parse.
 *
 * Vercel Analytics is mounted in the root layout and records the pageview from an
 * injected script (`/_vercel/insights/script.js`), so the beacon for /r/<code> is not
 * sent until that script has been fetched and executed. Redirecting synchronously —
 * or in an effect with no delay — can unload the document first, and the outreach code
 * never appears as its own path in Analytics, which is the only reason these routes exist.
 *
 * The delay is a margin, not a handshake: there is no callback from the insights script
 * to wait on. 1500ms is well past a normal script fetch on a warm edge cache, and short
 * enough that a reader who lands here does not think the link is broken.
 */
const REDIRECT_DELAY_MS = 1500;

export function OutreachRedirect({ target }: { target: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // replace(), not assign(): the /r/<code> hop must not sit in the back stack,
      // or the browser Back button bounces the reader through the redirect again.
      window.location.replace(target);
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [target]);

  return null;
}
