type ExecutiveKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  trendLabel?: string;
  trendDirection?: "up" | "down" | "flat";
};

export function ExecutiveKpiCard({
  label,
  value,
  hint,
  trendLabel,
  trendDirection = "flat",
}: ExecutiveKpiCardProps) {
  return (
    <article className="executive-kpi-card">
      <p className="kpi-label">{label}</p>
      <strong className="executive-kpi-value">{value}</strong>
      {trendLabel ? <span className={`trend-badge trend-${trendDirection}`}>{trendLabel}</span> : null}
      {hint ? <p className="kpi-hint">{hint}</p> : null}
    </article>
  );
}
