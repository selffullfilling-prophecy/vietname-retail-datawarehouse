type InsightListItem = {
  label: string;
  value: string;
  description: string;
};

type InsightListProps = {
  items: InsightListItem[];
};

export function InsightList({ items }: InsightListProps) {
  return (
    <ul className="insight-list">
      {items.map((item) => (
        <li key={item.label} className="insight-list-item">
          <p className="detail-label">{item.label}</p>
          <strong>{item.value}</strong>
          <p className="muted">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
