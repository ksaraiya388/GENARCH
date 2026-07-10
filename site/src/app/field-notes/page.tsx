import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FIELD_NOTES } from "@/lib/fieldNotes";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  } catch {
    return dateStr;
  }
}

export default function FieldNotesPage() {
  const notes = [...FIELD_NOTES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Field Notes" }]} />
        <header>
          <h1 className="text-h1 text-surface-white">Field Notes</h1>
          <p className="mt-2 text-cool-light max-w-2xl leading-relaxed">
            Notes from building GENARCH, in my own voice. What the work was
            actually like, what fought me, and what I got wrong. For the record
            of what shipped and when, see the{" "}
            <Link
              href="/updates"
              className="text-teal-primary hover:text-teal-soft hover:underline"
            >
              changelog
            </Link>
            .
          </p>
        </header>

        <div className="space-y-10">
          {notes.map((note) => (
            <article key={note.slug} className="space-y-3">
              <div>
                <h2 className="text-h2 text-surface-white">{note.title}</h2>
                <time dateTime={note.date} className="text-xs text-cool-mid">
                  {formatDate(note.date)}
                </time>
              </div>
              <div className="space-y-3 text-sm text-cool-light leading-relaxed">
                {note.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        {notes.length === 0 && (
          <p className="text-cool-light italic">No field notes yet.</p>
        )}
      </div>
    </div>
  );
}
