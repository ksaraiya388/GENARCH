/**
 * The site's canonical origin.
 *
 * Needed for the first time by the report routes, which emit bibliographic metadata.
 * A Highwire `citation_pdf_url` and a JSON-LD identifier have to be absolute: a
 * reference manager resolving a relative path against its own host fetches nothing,
 * and that failure is silent.
 *
 * It is a constant rather than an environment variable because the site is a static
 * export with no runtime, so there is no request to read a host from, and because a
 * citable document's identifiers should not change with where it happens to be built.
 * `site/src/components/figures/FigureFrame.tsx` prints the same domain as a credit
 * line; if the domain ever moves, both change together.
 */
export const SITE_ORIGIN = "https://genarch.org";

/** An absolute URL for a site-root-relative path. */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${suffix}`;
}
