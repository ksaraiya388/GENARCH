import Link from "next/link";

export interface FooterProps {
  version?: string;
  lastPipelineRun?: string;
}

export function Footer({ version = "v1.0", lastPipelineRun }: FooterProps) {
  return (
    <footer
      className="mt-auto border-t border-gray-100 bg-white px-4 py-8"
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
          <div className="space-y-2">
            <p className="text-sm text-genarch-text font-medium">
              © 2026 GENARCH
            </p>
            <p className="text-sm text-genarch-subtext">{version}</p>
          </div>

          <div className="space-y-2 text-sm text-genarch-subtext">
            <p>
              Licensed under{" "}
              <Link
                href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-genarch-link hover:underline"
              >
                CC BY-NC-SA 4.0
              </Link>
            </p>
            {lastPipelineRun && (
              <p>
                Last pipeline run:{" "}
                <time dateTime={lastPipelineRun}>{lastPipelineRun}</time>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-genarch-subtext max-w-2xl">
            GENARCH is an educational atlas. Nothing on this site constitutes
            medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
