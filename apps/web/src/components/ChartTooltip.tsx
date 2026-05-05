type ChartTooltipProps = {
  label: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  sharePercent?: number;
  hint?: string;
};

export function ChartTooltip({
  label,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  sharePercent,
  hint,
}: ChartTooltipProps) {
  return (
    <div className="chart-tooltip" role="status">
      <strong>{label}</strong>
      <span>
        {primaryLabel}: {primaryValue}
      </span>
      {secondaryLabel && secondaryValue ? (
        <span>
          {secondaryLabel}: {secondaryValue}
        </span>
      ) : null}
      {typeof sharePercent === "number" ? <span>Tỷ trọng: {sharePercent.toFixed(1)}%</span> : null}
      {hint ? <em>{hint}</em> : null}
    </div>
  );
}
