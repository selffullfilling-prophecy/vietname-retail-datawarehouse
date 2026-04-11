import { SectionCard } from "../components/SectionCard";

export function SalesPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sales Analysis</p>
          <h2>Revenue and volume exploration</h2>
          <p className="muted">
            This view will support slice/dice by time, store, customer, and product, with controlled drill-down from region to store.
          </p>
        </div>
      </header>

      <SectionCard
        title="Planned interactions"
        description="These capabilities map directly to the SSAS model already designed."
      >
        <ul className="flat-list">
          <li>Slice by year, quarter, month, region, city, customer segment, and product code.</li>
          <li>Drill down from Bang to Thanhpho to Macuahang.</li>
          <li>Switch between revenue and sales volume without rebuilding the page.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
