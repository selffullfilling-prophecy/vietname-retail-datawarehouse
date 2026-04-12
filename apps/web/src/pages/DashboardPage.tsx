import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import {
  getHealth,
  getInventoryStoreBreakdown,
  getInventorySummaryByYear,
  getMetadataOverview,
  getSalesStoreBreakdown,
  getSalesSummaryByYear,
  type HealthResponse,
  type InventoryStoreBreakdownResponse,
  type MetadataOverviewResponse,
  type SalesStoreBreakdownResponse,
  type YearInventorySummaryResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

export function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metadata, setMetadata] = useState<MetadataOverviewResponse | null>(null);
  const [salesSummary, setSalesSummary] = useState<YearSalesSummaryResponse | null>(null);
  const [inventorySummary, setInventorySummary] = useState<YearInventorySummaryResponse | null>(null);
  const [salesStates, setSalesStates] = useState<SalesStoreBreakdownResponse | null>(null);
  const [inventoryStates, setInventoryStates] = useState<InventoryStoreBreakdownResponse | null>(null);
  const [selectedExecutiveYear, setSelectedExecutiveYear] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const [
          healthResponse,
          metadataResponse,
          salesSummaryResponse,
          inventorySummaryResponse,
        ] = await Promise.all([
          getHealth(),
          getMetadataOverview(),
          getSalesSummaryByYear(),
          getInventorySummaryByYear(),
        ]);

        if (!isMounted) {
          return;
        }

        setHealth(healthResponse);
        setMetadata(metadataResponse);
        setSalesSummary(salesSummaryResponse);
        setInventorySummary(inventorySummaryResponse);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown dashboard error.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedExecutiveYear !== "all" || !salesSummary?.rows.length) {
      return;
    }

    setSelectedExecutiveYear(salesSummary.rows.at(-1)?.year ?? "all");
  }, [salesSummary, selectedExecutiveYear]);

  useEffect(() => {
    let isMounted = true;

    async function loadExecutiveBreakdowns() {
      if (!salesSummary?.rows.length) {
        return;
      }

      try {
        const yearFilter = selectedExecutiveYear === "all" ? undefined : selectedExecutiveYear;
        const [salesStatesResponse, inventoryStatesResponse] = await Promise.all([
          getSalesStoreBreakdown("state", undefined, undefined, yearFilter),
          getInventoryStoreBreakdown("state", undefined, undefined, yearFilter),
        ]);

        if (!isMounted) {
          return;
        }

        setSalesStates(salesStatesResponse);
        setInventoryStates(inventoryStatesResponse);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown executive filter error.";
        setError(message);
      }
    }

    void loadExecutiveBreakdowns();

    return () => {
      isMounted = false;
    };
  }, [salesSummary, selectedExecutiveYear]);

  const cubeCount = metadata?.cubes.length ?? 0;
  const latestSalesYear = salesSummary?.rows.at(-1) ?? null;
  const previousSalesYear = salesSummary?.rows.at(-2) ?? null;
  const latestInventoryYear = inventorySummary?.rows.at(-1) ?? null;
  const executiveYears = salesSummary?.rows.map((row) => row.year) ?? [];
  const totalRevenue = salesSummary?.rows.reduce((sum, row) => sum + row.revenue, 0) ?? 0;
  const totalSalesVolume = salesSummary?.rows.reduce((sum, row) => sum + row.salesVolume, 0) ?? 0;
  const averageInventoryAcrossYears = inventorySummary?.rows.length
    ? (inventorySummary.rows.reduce((sum, row) => sum + row.averageInventory, 0) / inventorySummary.rows.length)
    : 0;
  const revenueGrowth = useMemo(() => {
    if (!latestSalesYear || !previousSalesYear || previousSalesYear.revenue === 0) {
      return null;
    }

    return ((latestSalesYear.revenue - previousSalesYear.revenue) / previousSalesYear.revenue) * 100;
  }, [latestSalesYear, previousSalesYear]);
  const topRevenueState = useMemo(() => {
    if (!salesStates?.rows.length) {
      return null;
    }

    return [...salesStates.rows].sort((left, right) => right.revenue - left.revenue)[0];
  }, [salesStates]);
  const topInventoryState = useMemo(() => {
    if (!inventoryStates?.rows.length) {
      return null;
    }

    return [...inventoryStates.rows].sort((left, right) => right.averageInventory - left.averageInventory)[0];
  }, [inventoryStates]);
  const revenueLeaders = useMemo(
    () => [...(salesStates?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    [salesStates],
  );
  const inventoryHotspots = useMemo(
    () => [...(inventoryStates?.rows ?? [])].sort((left, right) => right.averageInventory - left.averageInventory).slice(0, 5),
    [inventoryStates],
  );
  const selectedSalesYear = useMemo(() => {
    if (!salesSummary?.rows.length) {
      return null;
    }

    if (selectedExecutiveYear === "all") {
      return latestSalesYear;
    }

    return salesSummary.rows.find((row) => row.year === selectedExecutiveYear) ?? null;
  }, [latestSalesYear, salesSummary, selectedExecutiveYear]);
  const selectedInventoryYear = useMemo(() => {
    if (!inventorySummary?.rows.length) {
      return null;
    }

    if (selectedExecutiveYear === "all") {
      return latestInventoryYear;
    }

    return inventorySummary.rows.find((row) => row.year === selectedExecutiveYear) ?? null;
  }, [inventorySummary, latestInventoryYear, selectedExecutiveYear]);

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
  }

  function formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(value)}%`;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Executive Overview</p>
          <h2>Live executive pulse across revenue, volume, and stock</h2>
          <p className="muted">
            This overview now reads real SSAS outputs. We are using it as the fast top layer before drilling into Sales and Inventory detail pages.
          </p>
        </div>
      </header>

      <div className="kpi-grid">
        <KpiCard
          label="Total revenue"
          value={isLoading ? "Loading..." : formatNumber(totalRevenue)}
          hint={latestSalesYear ? `Combined revenue across ${salesSummary?.rows.length ?? 0} years, latest year ${latestSalesYear.year}.` : "Waiting for SalesCube yearly summary."}
        />
        <KpiCard
          label="Sales volume"
          value={isLoading ? "Loading..." : formatNumber(totalSalesVolume)}
          hint={latestSalesYear ? `${formatNumber(latestSalesYear.salesVolume)} units sold in ${latestSalesYear.year}.` : "Waiting for SalesCube yearly summary."}
        />
        <KpiCard
          label="Revenue growth"
          value={isLoading ? "Loading..." : revenueGrowth === null ? "--" : formatPercent(revenueGrowth)}
          hint={
            latestSalesYear && previousSalesYear
              ? `${previousSalesYear.year} to ${latestSalesYear.year} year-over-year revenue movement.`
              : "Need at least two yearly points to compute growth."
          }
        />
        <KpiCard
          label="Avg inventory"
          value={isLoading ? "Loading..." : formatNumber(averageInventoryAcrossYears)}
          hint={latestInventoryYear ? `Average of yearly InventoryCube values, latest year ${latestInventoryYear.year}.` : "Waiting for InventoryCube yearly summary."}
        />
      </div>

      {error ? (
        <section className="status-panel error-panel">
          <strong>Executive dashboard load failed</strong>
          <p>{error}</p>
          <p className="muted">The page depends on multiple cube queries. If one API is down, this summary should be checked from Swagger first.</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="status-panel">
          <strong>Loading executive signals...</strong>
          <p className="muted">The dashboard is waiting for health, metadata, yearly summaries, and state-level breakdowns.</p>
        </section>
      ) : null}

      <SectionCard
        title="Executive pulse"
        description="This section keeps the current operating picture small and readable before we drill into specific cubes."
      >
        <div className="drill-toolbar">
          <div className="breadcrumb-row">
            <button
              type="button"
              className={`breadcrumb-button ${selectedExecutiveYear === "all" ? "breadcrumb-button-active" : ""}`}
              onClick={() => setSelectedExecutiveYear("all")}
            >
              All years
            </button>
            {executiveYears.map((year) => (
              <button
                key={year}
                type="button"
                className={`breadcrumb-button ${selectedExecutiveYear === year ? "breadcrumb-button-active" : ""}`}
                onClick={() => setSelectedExecutiveYear(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-grid">
          <div>
            <p className="detail-label">Service status</p>
            <p className="detail-value">
              <span className={`status-pill ${health?.status === "ok" ? "status-pill-ok" : ""}`}>
                {health?.status ?? "unknown"}
              </span>
            </p>
          </div>
          <div>
            <p className="detail-label">{selectedExecutiveYear === "all" ? "Latest revenue year" : "Selected year revenue"}</p>
            <p className="detail-value">{selectedSalesYear ? `${selectedSalesYear.year} · ${formatNumber(selectedSalesYear.revenue)}` : "--"}</p>
          </div>
          <div>
            <p className="detail-label">Top revenue state</p>
            <p className="detail-value">{topRevenueState ? `${topRevenueState.label} · ${formatNumber(topRevenueState.revenue)}` : "--"}</p>
          </div>
          <div>
            <p className="detail-label">{selectedExecutiveYear === "all" ? "Inventory hotspot" : "Selected year inventory"}</p>
            <p className="detail-value">
              {selectedExecutiveYear === "all"
                ? topInventoryState
                  ? `${topInventoryState.label} · ${formatNumber(topInventoryState.averageInventory)}`
                  : "--"
                : selectedInventoryYear
                  ? `${selectedInventoryYear.year} · ${formatNumber(selectedInventoryYear.averageInventory)}`
                  : "--"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Year-over-year trend"
        description="This gives leaders one compact view of how sales and inventory are moving before they drill into time or store detail."
      >
        <div className="data-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Revenue</th>
                <th>Sales volume</th>
                <th>Average inventory</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary?.rows.map((salesRow) => {
                const inventoryRow = inventorySummary?.rows.find((row) => row.year === salesRow.year);
                return (
                  <tr key={salesRow.year}>
                    <td>{salesRow.year}</td>
                    <td>{formatNumber(salesRow.revenue)}</td>
                    <td>{formatNumber(salesRow.salesVolume)}</td>
                    <td>{inventoryRow ? formatNumber(inventoryRow.averageInventory) : "--"}</td>
                  </tr>
                );
              }) ?? null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Regional leaders"
        description={
          selectedExecutiveYear === "all"
            ? "We are reusing the same Bang-level breakdowns that already power the guided store drill-down pages."
            : `These Bang-level rankings are filtered to ${selectedExecutiveYear}.`
        }
      >
        <div className="cube-grid">
          <article className="cube-card">
            <header className="cube-card-header">
              <div>
                <p className="eyebrow">SalesCube</p>
                <h3>Top states by revenue</h3>
              </div>
            </header>
            <div className="data-table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bang</th>
                    <th>Revenue</th>
                    <th>Sales volume</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueLeaders.map((row) => (
                    <tr key={row.memberUniqueName}>
                      <td>{row.label}</td>
                      <td>{formatNumber(row.revenue)}</td>
                      <td>{formatNumber(row.salesVolume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="cube-card">
            <header className="cube-card-header">
              <div>
                <p className="eyebrow">InventoryCube</p>
                <h3>Top states by average inventory</h3>
              </div>
            </header>
            <div className="data-table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bang</th>
                    <th>Average inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryHotspots.map((row) => (
                    <tr key={row.memberUniqueName}>
                      <td>{row.label}</td>
                      <td>{formatNumber(row.averageInventory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="OLAP model snapshot"
        description="This is now just a compact sanity check that the dashboard is still aligned with the deployed SSAS catalog."
      >
        <div className="detail-grid">
          <div>
            <p className="detail-label">Catalog</p>
            <p className="detail-value">{health?.ssas.catalog ?? "--"}</p>
          </div>
          <div>
            <p className="detail-label">Data source</p>
            <p className="detail-value">{health?.ssas.dataSource ?? "--"}</p>
          </div>
          <div>
            <p className="detail-label">Cubes deployed</p>
            <p className="detail-value">{cubeCount}</p>
          </div>
          <div>
            <p className="detail-label">Metadata refreshed</p>
            <p className="detail-value">{metadata?.generatedAtUtc ?? "--"}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
