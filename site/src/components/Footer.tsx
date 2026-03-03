import Link from "next/link";
import Image from "next/image";

export interface FooterProps {
  version?: string;
  lastPipelineRun?: string;
}

export function Footer({ version = "v1.0", lastPipelineRun }: FooterProps) {
  return (
    <footer
      className="mt-auto border-t border-white/[0.06] px-4 py-10"
      style={{ backgroundColor: "#091A27" }}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Image src="/G_GENARCH.svg" alt="" width={28} height={28} aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide">
                <span className="text-teal-primary">GEN</span>
                <span className="text-cool-mid">ARCH</span>
              </span>
            </div>
            <p className="text-xs text-cool-mid max-w-xs leading-relaxed">
              A systems-level genetic epidemiology atlas mapping gene–environment
              interactions at population scale.
            </p>
          </div>

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
              <p className="text-cool-light text-sm">{version}</p>
              <Link
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank" rel="noopener noreferrer"
                className="text-cool-light hover:text-teal-primary text-sm no-underline"
              >
                CC BY-NC-SA 4.0
              </Link>
              {lastPipelineRun && (
                <p className="text-cool-mid text-xs">Pipeline: <time dateTime={lastPipelineRun}>{lastPipelineRun}</time></p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.04]">
          <p className="text-xs text-cool-mid">
            GENARCH is an educational atlas. Nothing on this site constitutes
            medical advice. All content is for educational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
