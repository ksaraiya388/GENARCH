import type { Reference } from "@/lib/types";

interface CitationsProps {
  references: Reference[];
}

export function Citations({ references }: CitationsProps): JSX.Element {
  return (
    <section className="content-card">
      <h2 className="section-title">References</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-textSecondary">
        {references.map((reference) => (
          <li key={reference.id} id={reference.id}>
            <span className="font-medium text-textPrimary">{reference.title}</span> ({reference.year}).{" "}
            {reference.source}
            {reference.url ? (
              <>
                {" "}
                <a href={reference.url} target="_blank" rel="noreferrer">
                  Link
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
