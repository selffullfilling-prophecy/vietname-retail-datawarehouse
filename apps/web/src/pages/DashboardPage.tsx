import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";

export function DashboardPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Executive Overview</p>
          <h2>Command dashboard for sales and inventory</h2>
          <p className="muted">
            This page will be wired to SSAS KPI endpoints first, then extended with drill-down and saved views.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <KpiCard label="Total revenue" value="--" hint="Will bind to SalesCube.Tongtien" />
        <KpiCard label="Sales volume" value="--" hint="Will bind to SalesCube.Soluongban" />
        <KpiCard label="Average inventory" value="--" hint="Will bind to InventoryCube.Soluongtonkho" />
        <KpiCard label="Sales growth" value="--" hint="Calculated measure planned in SSAS." />
      </div>

      <SectionCard
        title="What the first release should answer"
        description="The first milestone is not full self-service BI. It is a controlled executive workflow."
      >
        <ul className="flat-list">
          <li>Which region, city, or store is driving revenue right now.</li>
          <li>Which products are moving and which inventory positions need attention.</li>
          <li>How to drill from total revenue down to the specific store and month that explains the number.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
