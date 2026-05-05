type TrendBadgeProps = {
  label: string;
  direction?: "up" | "down" | "flat";
};

export function TrendBadge({ label, direction = "flat" }: TrendBadgeProps) {
  return <span className={`trend-badge trend-${direction}`}>{label}</span>;
}
