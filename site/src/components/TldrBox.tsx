import Link from "next/link";

interface TldrBoxProps {
  whatItIs: string;
  whyItMatters: string;
  whatScienceSays: string;
}

export function TldrBox({ whatItIs, whyItMatters, whatScienceSays }: TldrBoxProps) {
  return (
    <aside
      className="border border-white/[0.08] border-l-4 border-l-teal-primary rounded-md p-5 bg-navy-mid/50 space-y-3"
      aria-label="Plain-language summary"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cool-mid">
        In plain terms
      </p>
      <div className="space-y-2 text-sm text-cool-light leading-relaxed">
        <p>{whatItIs}</p>
        <p>{whyItMatters}</p>
        <p>{whatScienceSays}</p>
      </div>
      <p className="text-xs text-cool-mid pt-1">
        New to the terms?{" "}
        <Link href="/glossary" className="text-teal-primary hover:text-teal-soft hover:underline">
          See the glossary.
        </Link>
      </p>
    </aside>
  );
}

export type { TldrBoxProps };
