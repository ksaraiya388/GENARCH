import Link from "next/link";

import { SiteSearch } from "@/components/search/SiteSearch";

const navItems = [
  { href: "/atlas", label: "Atlas" },
  { href: "/mechanism-briefs", label: "Mechanism Briefs" },
  { href: "/graph", label: "Graph" },
  { href: "/community", label: "Community" },
  { href: "/methods", label: "Methods" },
  { href: "/updates", label: "Updates" },
  { href: "/passport", label: "Passport" }
];

export function TopNav(): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-textPrimary no-underline">
          GENARCH
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2 py-1 text-textSecondary no-underline hover:bg-slate-100 hover:text-textPrimary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto w-full md:w-auto">
          <SiteSearch />
        </div>
      </div>
    </header>
  );
}
