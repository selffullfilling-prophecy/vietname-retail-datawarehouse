import { SectionCard } from "../components/SectionCard";

export function InventoryPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Inventory Analysis</p>
          <h2>Average inventory monitoring</h2>
          <p className="muted">
            Inventory will use the SSAS semi-additive measure and a guided UI so executives do not misread time roll-ups.
          </p>
        </div>
      </header>

      <SectionCard
        title="Planned interactions"
        description="This page is designed around the current InventoryCube aggregate function AverageOfChildren."
      >
        <ul className="flat-list">
          <li>Show average inventory clearly, not ending inventory.</li>
          <li>Filter by product code, city, store, year, quarter, and month.</li>
          <li>Drill from region to city to store for stock investigation.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
