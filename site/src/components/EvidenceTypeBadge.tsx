export type EvidenceType = "GWAS" | "eQTL" | "pathway" | "literature" | "inferred";

export interface EvidenceTypeBadgeProps {
  type: EvidenceType;
}

const TYPE_STYLES: Record<EvidenceType, string> = {
  GWAS: "badge-gwas",
  eQTL: "badge-eqtl",
  pathway: "badge-pathway",
  literature: "badge-literature",
  inferred: "badge-inferred",
};

export function EvidenceTypeBadge({ type }: EvidenceTypeBadgeProps) {
  return (
    <span className={`badge ${TYPE_STYLES[type]}`}>
      {type}
    </span>
  );
}
