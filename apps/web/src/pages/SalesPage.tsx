import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import {
  getSalesSummaryByYear,
  getSalesStoreBreakdown,
  getSalesTimeBreakdown,
  type SalesStoreBreakdownResponse,
  type SalesTimeBreakdownResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

type PivotOrientation = "rows-years" | "rows-states";
type SalesMetric = "revenue" | "salesVolume";

export function SalesPage() {
  const [summary, setSummary] = useState<YearSalesSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<SalesTimeBreakdownResponse | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [storeBreakdown, setStoreBreakdown] = useState<SalesStoreBreakdownResponse | null>(null);
  const [storeBreakdownLoading, setStoreBreakdownLoading] = useState(true);
  const [storeBreakdownError, setStoreBreakdownError] = useState<string | null>(null);
  const [pivotSnapshots, setPivotSnapshots] = useState<Record<string, SalesStoreBreakdownResponse["rows"]>>({});
  const [pivotLoading, setPivotLoading] = useState(true);
  const [pivotError, setPivotError] = useState<string | null>(null);
  const [pivotOrientation, setPivotOrientation] = useState<PivotOrientation>("rows-years");
  const [pivotMetric, setPivotMetric] = useState<SalesMetric>("revenue");
  const [selectedPivotYears, setSelectedPivotYears] = useState<string[]>([]);
  const [selectedPivotStates, setSelectedPivotStates] = useState<string[]>([]);
  const [drillState, setDrillState] = useState<{
    level: "year" | "quarter" | "month";
    year?: string;
    quarter?: string;
  }>({ level: "year" });
  const [storeDrillState, setStoreDrillState] = useState<{
    level: "state" | "city" | "store";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });

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

  useEffect(() => {
    let isMounted = true;

    async function loadStoreBreakdown() {
      try {
        setStoreBreakdownLoading(true);
        setStoreBreakdownError(null);

        const response = await getSalesStoreBreakdown(
          storeDrillState.level,
          storeDrillState.stateMemberUniqueName,
          storeDrillState.cityMemberUniqueName,
        );

        if (!isMounted) {
          return;
        }

        setStoreBreakdown(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown store breakdown error.";
        setStoreBreakdownError(message);
      } finally {
        if (isMounted) {
          setStoreBreakdownLoading(false);
        }
      }
    }

    void loadStoreBreakdown();

    return () => {
      isMounted = false;
    };
  }, [storeDrillState]);

  useEffect(() => {
    let isMounted = true;

    async function loadPivotSnapshots() {
      if (!summary?.rows.length) {
        return;
      }

      try {
        setPivotLoading(true);
        setPivotError(null);

        const responses = await Promise.all(
          summary.rows.map(async (row) => ({
            year: row.year,
            response: await getSalesStoreBreakdown("state", undefined, undefined, row.year),
          })),
        );

        if (!isMounted) {
          return;
        }

        const nextSnapshots: Record<string, SalesStoreBreakdownResponse["rows"]> = {};
        for (const item of responses) {
          nextSnapshots[item.year] = item.response.rows;
        }

        setPivotSnapshots(nextSnapshots);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown slice/dice error.";
        setPivotError(message);
      } finally {
        if (isMounted) {
          setPivotLoading(false);
        }
      }
    }

    void loadPivotSnapshots();

    return () => {
      isMounted = false;
    };
  }, [summary]);

  const totalRevenue = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.revenue, 0) ?? 0,
    [summary],
  );
  const totalSalesVolume = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.salesVolume, 0) ?? 0,
    [summary],
  );
  const availableYears = summary?.rows.map((row) => row.year) ?? [];
  const availableStates = useMemo(() => {
    const labels = new Set<string>();

    Object.values(pivotSnapshots).forEach((rows) => {
      rows.forEach((row) => labels.add(row.label));
    });

    return [...labels];
  }, [pivotSnapshots]);

  useEffect(() => {
    if (!availableYears.length) {
      return;
    }

    setSelectedPivotYears((previous) => {
      if (!previous.length) {
        return availableYears;
      }

      return previous.filter((year) => availableYears.includes(year));
    });
  }, [availableYears]);

  useEffect(() => {
    if (!availableStates.length) {
      return;
    }

    setSelectedPivotStates((previous) => {
      if (!previous.length) {
        return availableStates;
      }

      return previous.filter((state) => availableStates.includes(state));
    });
  }, [availableStates]);

  const pivotValueByYearState = useMemo(() => {
    const values = new Map<string, { revenue: number; salesVolume: number }>();

    Object.entries(pivotSnapshots).forEach(([year, rows]) => {
      rows.forEach((row) => {
        values.set(`${year}::${row.label}`, {
          revenue: row.revenue,
          salesVolume: row.salesVolume,
        });
      });
    });

    return values;
  }, [pivotSnapshots]);

  const filteredPivotYears = selectedPivotYears.length ? selectedPivotYears : availableYears;
  const filteredPivotStates = selectedPivotStates.length ? selectedPivotStates : availableStates;
  const pivotColumnLabels = pivotOrientation === "rows-years" ? filteredPivotStates : filteredPivotYears;
  const pivotRowLabels = pivotOrientation === "rows-years" ? filteredPivotYears : filteredPivotStates;

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
  }

  function toggleItem(currentItems: string[], nextItem: string, allItems: string[], setter: (items: string[]) => void) {
    if (currentItems.length === 1 && currentItems[0] === nextItem) {
      return;
    }

    if (currentItems.includes(nextItem)) {
      const nextItems = currentItems.filter((item) => item !== nextItem);
      setter(nextItems.length ? nextItems : [nextItem]);
      return;
    }

    setter([...currentItems, nextItem]);
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

  function handleStoreDrillDown(row: SalesStoreBreakdownResponse["rows"][number]) {
    if (!storeBreakdown?.drillTargetLevel) {
      return;
    }

    if (storeBreakdown.level === "state") {
      setStoreDrillState({
        level: "city",
        stateMemberUniqueName: row.memberUniqueName,
        stateLabel: row.label,
      });
      return;
    }

    if (storeBreakdown.level === "city" && storeDrillState.stateMemberUniqueName && storeDrillState.stateLabel) {
      setStoreDrillState({
        level: "store",
        stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
        stateLabel: storeDrillState.stateLabel,
        cityMemberUniqueName: row.memberUniqueName,
        cityLabel: row.label,
      });
    }
  }

  function handleStoreRollUp() {
    if (storeDrillState.level === "store" && storeDrillState.stateMemberUniqueName && storeDrillState.stateLabel) {
      setStoreDrillState({
        level: "city",
        stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
        stateLabel: storeDrillState.stateLabel,
      });
      return;
    }

    if (storeDrillState.level === "city") {
      setStoreDrillState({ level: "state" });
    }
  }

  function getPivotValue(year: string, state: string): number {
    const value = pivotValueByYearState.get(`${year}::${state}`);
    if (!value) {
      return 0;
    }

    return pivotMetric === "revenue" ? value.revenue : value.salesVolume;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sales Analysis</p>
          <h2>Revenue and volume exploration</h2>
          <p className="muted">
            This view now supports drill-down, slice/dice, and guided pivoting across time and store dimensions.
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
          value={String(availableYears.length)}
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
        description="Start at year, then drill into quarter and month, and roll back up when needed."
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

      {storeBreakdownError ? (
        <section className="status-panel error-panel">
          <strong>Sales store drill-down failed</strong>
          <p>{storeBreakdownError}</p>
          <p className="muted">If time drill-down works but store drill-down fails, we should validate the Dim Store hierarchy path and member unique names returned from SSAS.</p>
        </section>
      ) : null}

      <SectionCard
        title="Guided store drill-down"
        description="This OLAP path follows the Store hierarchy directly: Bang to Thanhpho to Macuahang."
      >
        <div className="drill-toolbar">
          <div className="breadcrumb-row">
            <button
              type="button"
              className={`breadcrumb-button ${storeDrillState.level === "state" ? "breadcrumb-button-active" : ""}`}
              onClick={() => setStoreDrillState({ level: "state" })}
            >
              Bang
            </button>
            {storeDrillState.stateLabel ? (
              <button
                type="button"
                className={`breadcrumb-button ${storeDrillState.level === "city" ? "breadcrumb-button-active" : ""}`}
                onClick={() =>
                  setStoreDrillState({
                    level: "city",
                    stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
                    stateLabel: storeDrillState.stateLabel,
                  })}
              >
                {storeDrillState.stateLabel}
              </button>
            ) : null}
            {storeDrillState.cityLabel ? (
              <span className="breadcrumb-chip">{storeDrillState.cityLabel}</span>
            ) : null}
          </div>

          {storeDrillState.level !== "state" ? (
            <button type="button" className="secondary-button" onClick={handleStoreRollUp}>
              Roll up
            </button>
          ) : null}
        </div>

        {storeBreakdownLoading ? (
          <p className="muted">Loading store breakdown from SSAS...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{storeBreakdown?.level === "state" ? "Bang" : storeBreakdown?.level === "city" ? "Thanh pho" : "Ma cua hang"}</th>
                  <th>Revenue</th>
                  <th>Sales volume</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {storeBreakdown?.rows.map((row) => (
                  <tr key={`${storeBreakdown.level}-${row.memberUniqueName}`}>
                    <td>{row.label}</td>
                    <td>{formatNumber(row.revenue)}</td>
                    <td>{formatNumber(row.salesVolume)}</td>
                    <td>
                      {row.canDrillDown && storeBreakdown.drillTargetLevel ? (
                        <button type="button" className="secondary-button" onClick={() => handleStoreDrillDown(row)}>
                          View {storeBreakdown.drillTargetLevel}
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

      {pivotError ? (
        <section className="status-panel error-panel">
          <strong>Sales slice/dice failed</strong>
          <p>{pivotError}</p>
          <p className="muted">This pivot section reuses year-filtered Bang breakdowns, so failures usually mean one of those state-level queries is down.</p>
        </section>
      ) : null}

      <SectionCard
        title="Guided slice, dice, and pivot"
        description="This cross-tab lets you filter years and Bang, then swap rows and columns without changing cube logic."
      >
        <div className="filter-toolbar">
          <div className="filter-group">
            <p className="detail-label">Measure</p>
            <div className="pill-row">
              <button
                type="button"
                className={`filter-pill ${pivotMetric === "revenue" ? "filter-pill-active" : ""}`}
                onClick={() => setPivotMetric("revenue")}
              >
                Revenue
              </button>
              <button
                type="button"
                className={`filter-pill ${pivotMetric === "salesVolume" ? "filter-pill-active" : ""}`}
                onClick={() => setPivotMetric("salesVolume")}
              >
                Sales volume
              </button>
            </div>
          </div>

          <div className="filter-group">
            <p className="detail-label">Pivot</p>
            <div className="pill-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setPivotOrientation((current) =>
                    current === "rows-years" ? "rows-states" : "rows-years",
                  )}
              >
                Swap rows / columns
              </button>
            </div>
          </div>
        </div>

        <div className="filter-toolbar">
          <div className="filter-group">
            <p className="detail-label">Slice by year</p>
            <div className="pill-row">
              <button
                type="button"
                className={`filter-pill ${selectedPivotYears.length === availableYears.length ? "filter-pill-active" : ""}`}
                onClick={() => setSelectedPivotYears(availableYears)}
              >
                All years
              </button>
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`filter-pill ${selectedPivotYears.includes(year) ? "filter-pill-active" : ""}`}
                  onClick={() => toggleItem(selectedPivotYears, year, availableYears, setSelectedPivotYears)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <p className="detail-label">Dice by Bang</p>
            <div className="pill-row">
              <button
                type="button"
                className={`filter-pill ${selectedPivotStates.length === availableStates.length ? "filter-pill-active" : ""}`}
                onClick={() => setSelectedPivotStates(availableStates)}
              >
                All Bang
              </button>
              {availableStates.map((state) => (
                <button
                  key={state}
                  type="button"
                  className={`filter-pill ${selectedPivotStates.includes(state) ? "filter-pill-active" : ""}`}
                  onClick={() => toggleItem(selectedPivotStates, state, availableStates, setSelectedPivotStates)}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        </div>

        {pivotLoading ? (
          <p className="muted">Loading pivot source rows from state-level yearly slices...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{pivotOrientation === "rows-years" ? "Year" : "Bang"}</th>
                  {pivotColumnLabels.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pivotRowLabels.map((rowLabel) => (
                  <tr key={rowLabel}>
                    <td>{rowLabel}</td>
                    {pivotColumnLabels.map((columnLabel) => {
                      const value =
                        pivotOrientation === "rows-years"
                          ? getPivotValue(rowLabel, columnLabel)
                          : getPivotValue(columnLabel, rowLabel);

                      return <td key={`${rowLabel}-${columnLabel}`}>{formatNumber(value)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
