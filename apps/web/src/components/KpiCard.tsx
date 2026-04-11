type KpiCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <p className="kpi-label">{label}</p>
      <strong className="kpi-value">{value}</strong>
      <p className="kpi-hint">{hint}</p>
    </article>
  );
}
