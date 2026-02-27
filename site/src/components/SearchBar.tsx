"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidenceTypeBadge } from "./EvidenceTypeBadge";

export type SearchEntityType =
  | "disease"
  | "exposure"
  | "gene"
  | "pathway";

export type ConfidenceTier = "LOW" | "MEDIUM" | "HIGH";

export interface SearchableItem {
  id: string;
  label: string;
  href: string;
  entityType: SearchEntityType;
  confidenceTier?: ConfidenceTier;
  evidenceType?: "GWAS" | "eQTL" | "pathway" | "literature" | "inferred";
  summary?: string;
}

export interface SearchBarProps {
  items: SearchableItem[];
  placeholder?: string;
  maxResults?: number;
}

function getEntityTypeLabel(type: SearchEntityType): string {
  const labels: Record<SearchEntityType, string> = {
    disease: "Disease",
    exposure: "Exposure",
    gene: "Gene",
    pathway: "Pathway",
  };
  return labels[type];
}

function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

export function SearchBar({
  items,
  placeholder = "Search diseases, exposures, genes, pathways…",
  maxResults = 8,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["label", "summary"],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
      }),
    [items]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: maxResults });
  }, [query, fuse, maxResults]);

  const hasResults = searchResults.length > 0;
  const showDropdown = isOpen && query.trim().length > 0;

  useEffect(() => {
    setSelectedIndex(0);
    setIsOpen(query.trim().length > 0);
  }, [searchResults, query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) {
        if (e.key === "Escape") setQuery("");
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            window.location.href = searchResults[selectedIndex].item.href;
          }
          break;
        case "Escape":
          e.preventDefault();
          setQuery("");
          setIsOpen(false);
          (e.target as HTMLInputElement).blur();
          break;
      }
    },
    [showDropdown, searchResults, selectedIndex]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <label htmlFor="genarch-search" className="sr-only">
        Search GENARCH atlas
      </label>
      <input
        id="genarch-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && setIsOpen(true)}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="search-results"
        aria-activedescendant={
          showDropdown && searchResults[selectedIndex]
            ? `search-result-${selectedIndex}`
            : undefined
        }
        className="w-full rounded-sm border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm text-genarch-text placeholder:text-genarch-subtext focus:border-genarch-primary focus:outline-none focus:ring-2 focus:ring-genarch-primary/20"
        autoComplete="off"
      />
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-genarch-subtext"
        aria-hidden="true"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </span>

      {showDropdown && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-auto rounded-sm border border-gray-200 bg-white shadow-lg"
        >
          {hasResults ? (
            searchResults.map((result, index) => {
              const item = result.item;
              const isSelected = index === selectedIndex;
              return (
                <li
                  key={item.id}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={isSelected ? "bg-genarch-bg" : ""}
                >
                  <Link
                    href={item.href}
                    className="block px-4 py-3 hover:bg-genarch-bg focus:bg-genarch-bg focus:outline-none"
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-genarch-text">
                        {item.label}
                      </span>
                      <span
                        className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium bg-genarch-data/20 text-genarch-text"
                        aria-label={`Type: ${getEntityTypeLabel(item.entityType)}`}
                      >
                        {getEntityTypeLabel(item.entityType)}
                      </span>
                      {item.evidenceType && (
                        <EvidenceTypeBadge type={item.evidenceType.toLowerCase() as "gwas" | "eqtl" | "pathway" | "literature" | "inferred"} />
                      )}
                      {item.confidenceTier && (
                        <ConfidenceBadge tier={item.confidenceTier} />
                      )}
                    </div>
                    {item.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-genarch-subtext">
                        {truncateWithEllipsis(item.summary, 120)}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })
          ) : (
            <li
              role="option"
              className="px-4 py-6 text-center text-sm text-genarch-subtext"
            >
              No results found for &quot;{query}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
