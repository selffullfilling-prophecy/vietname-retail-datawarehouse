type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: "positive" | "negative" | "neutral";
};

export function KpiCard({ label, value, hint, tone = "neutral" }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card-${tone}`}>
      <p className="kpi-label">{label}</p>
      <strong className="kpi-value">{value}</strong>
      <p className="kpi-hint">{hint}</p>
    </article>
  );
}
