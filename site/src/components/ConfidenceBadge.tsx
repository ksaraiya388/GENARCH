export type ConfidenceTier = "LOW" | "MEDIUM" | "HIGH";

export interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
}

const TIER_STYLES: Record<
  ConfidenceTier,
  { className: string; label: string }
> = {
  LOW: {
    className: "bg-red-100 text-red-800 border-red-200",
    label: "Low confidence",
  },
  MEDIUM: {
    className: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Medium confidence",
  },
  HIGH: {
    className: "bg-green-100 text-green-800 border-green-200",
    label: "High confidence",
  },
};

export function ConfidenceBadge({ tier }: ConfidenceBadgeProps) {
  const { className, label } = TIER_STYLES[tier];

  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${className}`}
      role="status"
      aria-label={label}
    >
      {tier}
    </span>
  );
}
