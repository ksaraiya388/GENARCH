"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useCallback } from "react";

const NAV_LINKS = [
  { label: "Atlas", href: "/atlas" },
  { label: "Mechanism Briefs", href: "/mechanism-briefs" },
  { label: "Graph", href: "/graph" },
  { label: "Community", href: "/community" },
  { label: "Methods", href: "/methods" },
  { label: "Updates", href: "/updates" },
  { label: "Passport", href: "/passport" },
] as const;

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMobileMenuOpen((p) => !p), []);

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{ backgroundColor: "rgba(11, 31, 47, 0.95)", backdropFilter: "blur(12px)" }}
      role="banner"
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo: DNA helix G monogram + ENARCH wordmark */}
        <Link
          href="/"
          className="flex items-center gap-0 py-3 no-underline hover:no-underline group"
          onClick={closeMenu}
        >
          <Image
            src="/GENARCH_Official_Logo.png"
            alt="GENARCH"
            width={160}
            height={36}
            className="transition-opacity duration-200 opacity-90 group-hover:opacity-100"
            style={{ width: "auto", height: "36px" }}
            priority
          />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-2 text-sm font-medium text-cool-light no-underline rounded-md transition-colors duration-150 hover:text-teal-primary hover:bg-white/[0.04] hover:no-underline"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={toggleMenu}
          className="inline-flex lg:hidden items-center justify-center rounded-md p-2.5 text-cool-light hover:text-teal-primary hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-2 focus:ring-teal-primary/50"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`lg:hidden ${mobileMenuOpen ? "block" : "hidden"}`}
        role="dialog"
        aria-label="Mobile navigation"
      >
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-1" style={{ backgroundColor: "#0B1F2F" }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              className="block rounded-md px-3 py-2.5 text-base font-medium text-cool-light no-underline hover:text-teal-primary hover:bg-white/[0.04]"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
