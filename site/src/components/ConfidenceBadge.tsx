export type ConfidenceTier = "LOW" | "MEDIUM" | "HIGH";

export interface ConfidenceBadgeProps {
  tier: ConfidenceTier;
}

const TIER_STYLES: Record<ConfidenceTier, { className: string; label: string }> = {
  LOW: {
    className: "badge-low",
    label: "Low confidence",
  },
  MEDIUM: {
    className: "badge-medium",
    label: "Medium confidence",
  },
  HIGH: {
    className: "badge-high",
    label: "High confidence",
  },
};

export function ConfidenceBadge({ tier }: ConfidenceBadgeProps) {
  const { className, label } = TIER_STYLES[tier];

  return (
    <span
      className={`badge ${className}`}
      role="status"
      aria-label={label}
    >
      {tier}
    </span>
  );
}
