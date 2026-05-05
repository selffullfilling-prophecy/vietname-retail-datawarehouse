type InsightCardProps = {
  label: string;
  value: string;
  description: string;
};

export function InsightCard({ label, value, description }: InsightCardProps) {
  return (
    <article className="insight-card">
      <p className="detail-label">{label}</p>
      <strong>{value}</strong>
      <p className="muted">{description}</p>
    </article>
  );
}
