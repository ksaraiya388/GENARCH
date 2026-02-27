"use client";

import Link from "next/link";
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

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm"
      role="banner"
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 py-4 font-sans text-xl font-bold text-genarch-text hover:text-genarch-primary transition-colors"
          onClick={closeMenu}
        >
          <span
            className="rounded px-1.5 py-0.5 text-white"
            style={{ backgroundColor: "#F2766A" }}
          >
            G
          </span>
          <span>GENARCH</span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-genarch-text hover:text-genarch-primary transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={toggleMenu}
          className="inline-flex lg:hidden items-center justify-center rounded-sm p-2 text-genarch-text hover:bg-genarch-bg hover:text-genarch-primary focus:outline-none focus:ring-2 focus:ring-genarch-primary focus:ring-offset-2"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`lg:hidden ${mobileMenuOpen ? "block" : "hidden"}`}
        role="dialog"
        aria-label="Mobile navigation menu"
      >
        <div className="space-y-1 border-t border-gray-100 bg-white px-4 py-4">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              className="block rounded-sm px-3 py-2 text-base font-medium text-genarch-text hover:bg-genarch-bg hover:text-genarch-primary"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
