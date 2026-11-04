import { apaCitation, frontmatter, isPending } from "./frontmatter";

/**
 * The report's cover block.
 *
 * It carries the identifiers a citing reader needs and the two statements a reader
 * needs before the first finding: that the report has not been peer reviewed, and
 * that the sensor data belong to Virginia DEQ. A pending identifier is printed as
 * pending rather than omitted, so the gap is visible on the face of the document
 * instead of looking like an oversight.
 */
export function Cover() {
  const { title, version, date, doi, softwareDoi, status, license, licenseUrl, author } =
    frontmatter;

  return (
    <header className="report-cover" id="cover">
      <p className="report-cover-kicker">GENARCH Annual Report</p>
      <h1 className="report-cover-title">{title}</h1>

      <dl className="report-cover-meta">
        <div>
          <dt>Version</dt>
          <dd>{version}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{date}</dd>
        </div>
        <div>
          <dt>Author</dt>
          <dd>
            {author.name},{" "}
            <a href={`https://orcid.org/${author.orcid}`} className="report-orcid">
              ORCID {author.orcid}
            </a>
            . {author.affiliation}.
          </dd>
        </div>
        <div>
          <dt>Report DOI</dt>
          <dd>
            {isPending(doi) ? (
              <span className="report-pending">Pending</span>
            ) : (
              <a href={`https://doi.org/${doi}`}>https://doi.org/{doi}</a>
            )}
          </dd>
        </div>
        <div>
          <dt>Software DOI</dt>
          <dd>
            {isPending(softwareDoi) ? (
              <span className="report-pending">Pending</span>
            ) : (
              <a href={`https://doi.org/${softwareDoi}`}>https://doi.org/{softwareDoi}</a>
            )}
          </dd>
        </div>
        <div>
          <dt>Review status</dt>
          <dd className="report-cover-status">{status}</dd>
        </div>
        <div>
          <dt>License</dt>
          <dd>
            <a href={licenseUrl}>{license}</a>
          </dd>
        </div>
      </dl>

      <div className="report-cover-citation callout">
        <p className="report-callout-title">Recommended citation</p>
        <p className="report-cover-apa">{apaCitation()}</p>
      </div>

      <p className="report-cover-credit">{frontmatter.deqCredit}</p>
    </header>
  );
}
