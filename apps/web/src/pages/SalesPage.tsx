import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import {
  getSalesSummaryByYear,
  getSalesTimeBreakdown,
  type SalesTimeBreakdownResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

export function SalesPage() {
  const [summary, setSummary] = useState<YearSalesSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<SalesTimeBreakdownResponse | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [drillState, setDrillState] = useState<{
    level: "year" | "quarter" | "month";
    year?: string;
    quarter?: string;
  }>({ level: "year" });

  useEffect(() => {
    let isMounted = true;

    async function loadSalesSummary() {
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const response = await getSalesSummaryByYear();

        if (!isMounted) {
          return;
        }

        setSummary(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown sales page error.";
        setSummaryError(message);
      } finally {
        if (isMounted) {
          setSummaryLoading(false);
        }
      }
    }

    void loadSalesSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTimeBreakdown() {
      try {
        setBreakdownLoading(true);
        setBreakdownError(null);

        const response = await getSalesTimeBreakdown(
          drillState.level,
          drillState.year,
          drillState.quarter,
        );

        if (!isMounted) {
          return;
        }

        setBreakdown(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown time breakdown error.";
        setBreakdownError(message);
      } finally {
        if (isMounted) {
          setBreakdownLoading(false);
        }
      }
    }

    void loadTimeBreakdown();

    return () => {
      isMounted = false;
    };
  }, [drillState]);

  const totalRevenue = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.revenue, 0) ?? 0,
    [summary],
  );
  const totalSalesVolume = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.salesVolume, 0) ?? 0,
    [summary],
  );
  const availableYears = summary?.rows.length ?? 0;

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
  }

  function handleDrillDown(key: string) {
    if (!breakdown?.drillTargetLevel) {
      return;
    }

    const normalizedQuarterKey =
      breakdown.level === "quarter"
        ? key.match(/\d+/g)?.at(-1) ?? key
        : key;

    if (breakdown.level === "year") {
      setDrillState({
        level: "quarter",
        year: key,
      });
      return;
    }

    if (breakdown.level === "quarter" && breakdown.selectedYear) {
      setDrillState({
        level: "month",
        year: breakdown.selectedYear,
        quarter: normalizedQuarterKey,
      });
    }
  }

  function handleRollUp() {
    if (drillState.level === "month" && drillState.year) {
      setDrillState({
        level: "quarter",
        year: drillState.year,
      });
      return;
    }

    if (drillState.level === "quarter") {
      setDrillState({ level: "year" });
    }
  }

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

      <div className="kpi-grid">
        <KpiCard
          label="Total revenue"
          value={summaryLoading ? "Loading..." : formatNumber(totalRevenue)}
          hint="Aggregated from SalesCube.Tongtien by year."
        />
        <KpiCard
          label="Sales volume"
          value={summaryLoading ? "Loading..." : formatNumber(totalSalesVolume)}
          hint="Aggregated from SalesCube.Soluongban by year."
        />
        <KpiCard
          label="Years returned"
          value={String(availableYears)}
          hint="Number of year members returned by the current MDX query."
        />
      </div>

      {summaryError ? (
        <section className="status-panel error-panel">
          <strong>Sales page load failed</strong>
          <p>{summaryError}</p>
          <p className="muted">This usually means the MDX path for the year attribute needs adjusting to match the deployed cube.</p>
        </section>
      ) : null}

      <SectionCard
        title="Yearly sales summary"
        description="This is the first live data query from SalesCube. It gives us a stable base before drill-down and pivot."
      >
        {summaryLoading ? (
          <p className="muted">Loading yearly sales summary from SSAS...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Revenue</th>
                  <th>Sales volume</th>
                </tr>
              </thead>
              <tbody>
                {summary?.rows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{formatNumber(row.revenue)}</td>
                    <td>{formatNumber(row.salesVolume)}</td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {breakdownError ? (
        <section className="status-panel error-panel">
          <strong>Sales drill-down failed</strong>
          <p>{breakdownError}</p>
          <p className="muted">If summary works but drill-down fails, we should validate the year and quarter member paths used in MDX.</p>
        </section>
      ) : null}

      <SectionCard
        title="Guided time drill-down"
        description="This is the first OLAP interaction layer: start at year, then drill into quarter and month, and roll back up when needed."
      >
        <div className="drill-toolbar">
          <div className="breadcrumb-row">
            <button
              type="button"
              className={`breadcrumb-button ${drillState.level === "year" ? "breadcrumb-button-active" : ""}`}
              onClick={() => setDrillState({ level: "year" })}
            >
              Years
            </button>
            {drillState.year ? (
              <button
                type="button"
                className={`breadcrumb-button ${drillState.level === "quarter" ? "breadcrumb-button-active" : ""}`}
                onClick={() => setDrillState({ level: "quarter", year: drillState.year })}
              >
                {drillState.year}
              </button>
            ) : null}
            {drillState.quarter ? (
              <span className="breadcrumb-chip">Q{drillState.quarter}</span>
            ) : null}
          </div>

          {drillState.level !== "year" ? (
            <button type="button" className="secondary-button" onClick={handleRollUp}>
              Roll up
            </button>
          ) : null}
        </div>

        {breakdownLoading ? (
          <p className="muted">Loading time breakdown from SSAS...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{breakdown?.level === "year" ? "Year" : breakdown?.level === "quarter" ? "Quarter" : "Month"}</th>
                  <th>Revenue</th>
                  <th>Sales volume</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {breakdown?.rows.map((row) => (
                  <tr key={`${breakdown.level}-${row.key}`}>
                    <td>{row.label}</td>
                    <td>{formatNumber(row.revenue)}</td>
                    <td>{formatNumber(row.salesVolume)}</td>
                    <td>
                      {row.canDrillDown && breakdown.drillTargetLevel ? (
                        <button type="button" className="secondary-button" onClick={() => handleDrillDown(row.key)}>
                          View {breakdown.drillTargetLevel}
                        </button>
                      ) : (
                        <span className="muted">Leaf level</span>
                      )}
                    </td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

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
