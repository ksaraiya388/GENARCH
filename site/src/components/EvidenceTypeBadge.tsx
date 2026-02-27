export type EvidenceType =
  | "GWAS"
  | "gwas"
  | "eQTL"
  | "eqtl"
  | "pathway"
  | "literature"
  | "inferred";

export interface EvidenceTypeBadgeProps {
  type: EvidenceType;
}

const TYPE_STYLES: Record<
  string,
  { className: string; label: string; display: string }
> = {
  gwas: {
    className: "bg-blue-100 text-blue-800 border-blue-200",
    label: "GWAS evidence",
    display: "GWAS",
  },
  eqtl: {
    className: "bg-green-100 text-green-800 border-green-200",
    label: "eQTL evidence",
    display: "eQTL",
  },
  pathway: {
    className: "bg-purple-100 text-purple-800 border-purple-200",
    label: "Pathway evidence",
    display: "Pathway",
  },
  literature: {
    className: "bg-gray-100 text-gray-700 border-gray-200",
    label: "Literature evidence",
    display: "Literature",
  },
  inferred: {
    className: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Inferred evidence",
    display: "Inferred",
  },
};

export function EvidenceTypeBadge({ type }: EvidenceTypeBadgeProps) {
  const key = type.toLowerCase();
  const style = TYPE_STYLES[key] ?? TYPE_STYLES.literature;

  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${style.className}`}
      role="status"
      aria-label={style.label}
    >
      {style.display}
    </span>
  );
}
