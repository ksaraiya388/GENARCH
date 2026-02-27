"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function prettify(segment: string): string {
  if (!segment) return "";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Breadcrumbs(): JSX.Element | null {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) return null;

  return (
    <nav className="mx-auto mt-4 w-full max-w-7xl px-4 text-sm text-textSecondary" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="no-underline">
            Home
          </Link>
        </li>
        {segments.map((segment, idx) => {
          const href = `/${segments.slice(0, idx + 1).join("/")}`;
          const isLast = idx === segments.length - 1;
          return (
            <li className="flex items-center gap-2" key={href}>
              <span>/</span>
              {isLast ? (
                <span className="font-medium text-textPrimary">{prettify(segment)}</span>
              ) : (
                <Link href={href} className="no-underline">
                  {prettify(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
