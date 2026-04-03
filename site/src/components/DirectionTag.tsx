type Direction = "amplify" | "buffer" | "unknown";

interface DirectionTagProps {
  direction: Direction;
  className?: string;
}

const DIRECTION_STYLES: Record<Direction, { bg: string; text: string; label: string }> = {
  amplify: { bg: "bg-[#C53030]/15", text: "text-[#C53030]", label: "Amplify" },
  buffer: { bg: "bg-[#2F855A]/15", text: "text-[#2F855A]", label: "Buffer" },
  unknown: { bg: "bg-[#A0AEC0]/15", text: "text-[#A0AEC0]", label: "Unknown" },
};

export function DirectionTag({ direction, className = "" }: DirectionTagProps) {
  const style = DIRECTION_STYLES[direction] ?? DIRECTION_STYLES.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
}

export type { DirectionTagProps, Direction };
