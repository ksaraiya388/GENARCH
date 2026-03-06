import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer
      className="mt-auto border-t border-white/[0.06] px-4 py-10"
      style={{ backgroundColor: "#091A27" }}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Logo + mission */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-0 no-underline hover:no-underline group">
              <Image
                src="/GENARCH_Official_Logo.png"
                alt="GENARCH"
                width={107}
                height={24}
                style={{ width: "auto", height: "24px" }}
                aria-hidden="true"
              />
            </Link>
            <p className="text-xs text-cool-mid max-w-xs leading-relaxed">
              <span className="whitespace-nowrap">Genetic Epidemiology Network for At Risk Community Health.</span>{" "}
              A systems-level atlas mapping gene–environment interactions
              at population scale.
            </p>
            <p className="text-[10px] text-cool-dark uppercase tracking-[0.15em]">
              Global Exposome
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-col sm:flex-row gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cool-mid">Atlas</p>
              <Link href="/atlas/diseases" className="block text-cool-light hover:text-teal-primary text-sm no-underline">Diseases</Link>
              <Link href="/atlas/exposures" className="block text-cool-light hover:text-teal-primary text-sm no-underline">Exposures</Link>
              <Link href="/atlas/genes-pathways" className="block text-cool-light hover:text-teal-primary text-sm no-underline">Genes & Pathways</Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cool-mid">Resources</p>
              <Link href="/methods" className="block text-cool-light hover:text-teal-primary text-sm no-underline">Methods</Link>
              <Link href="/methods/ethics" className="block text-cool-light hover:text-teal-primary text-sm no-underline">Ethics</Link>
              <Link href="/graph" className="block text-cool-light hover:text-teal-primary text-sm no-underline">Knowledge Graph</Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cool-mid">About</p>
              <Link
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank" rel="noopener noreferrer"
                className="text-cool-light hover:text-teal-primary text-sm no-underline"
              >
                CC BY-NC-SA 4.0
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom: disclaimer + credit */}
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-cool-mid">
            GENARCH is an educational atlas. Nothing on this site constitutes
            medical advice. All content is for educational purposes only.
          </p>
          <p className="text-xs text-cool-dark whitespace-nowrap">
            Built by <span className="text-cool-mid">Kiaan Saraiya</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
