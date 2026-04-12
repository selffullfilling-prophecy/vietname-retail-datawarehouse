import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import {
  getInventorySummaryByYear,
  getInventoryStoreBreakdown,
  getInventoryTimeBreakdown,
  type InventoryStoreBreakdownResponse,
  type InventoryTimeBreakdownResponse,
  type YearInventorySummaryResponse,
} from "../services/api";

export function InventoryPage() {
  const [summary, setSummary] = useState<YearInventorySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<InventoryTimeBreakdownResponse | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [storeBreakdown, setStoreBreakdown] = useState<InventoryStoreBreakdownResponse | null>(null);
  const [storeBreakdownLoading, setStoreBreakdownLoading] = useState(true);
  const [storeBreakdownError, setStoreBreakdownError] = useState<string | null>(null);
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

    async function loadInventorySummary() {
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const response = await getInventorySummaryByYear();

        if (!isMounted) {
          return;
        }

        setSummary(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown inventory page error.";
        setSummaryError(message);
      } finally {
        if (isMounted) {
          setSummaryLoading(false);
        }
      }
    }

    void loadInventorySummary();

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

        const response = await getInventoryTimeBreakdown(
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

        const message = loadError instanceof Error ? loadError.message : "Unknown inventory time breakdown error.";
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

        const response = await getInventoryStoreBreakdown(
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

        const message = loadError instanceof Error ? loadError.message : "Unknown inventory store breakdown error.";
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

  const totalAverageInventory = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.averageInventory, 0) ?? 0,
    [summary],
  );
  const peakYear = useMemo(() => {
    if (!summary?.rows.length) {
      return null;
    }

    return [...summary.rows].sort((left, right) => right.averageInventory - left.averageInventory)[0];
  }, [summary]);

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

  function handleStoreDrillDown(row: InventoryStoreBreakdownResponse["rows"][number]) {
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

      <div className="kpi-grid">
        <KpiCard
          label="Total yearly average inventory"
          value={summaryLoading ? "Loading..." : formatNumber(totalAverageInventory)}
          hint="Sum of yearly average inventory values returned by InventoryCube."
        />
        <KpiCard
          label="Peak year"
          value={peakYear?.year ?? "--"}
          hint={peakYear ? `${formatNumber(peakYear.averageInventory)} average units` : "Highest year in the current query result."}
        />
        <KpiCard
          label="Years returned"
          value={String(summary?.rows.length ?? 0)}
          hint="Number of year members returned by the current MDX query."
        />
      </div>

      {summaryError ? (
        <section className="status-panel error-panel">
          <strong>Inventory page load failed</strong>
          <p>{summaryError}</p>
          <p className="muted">If this fails while sales works, we should verify the InventoryCube measure name and year hierarchy path.</p>
        </section>
      ) : null}

      <SectionCard
        title="Yearly inventory summary"
        description="This page reads the semi-additive inventory measure directly from InventoryCube."
      >
        {summaryLoading ? (
          <p className="muted">Loading yearly inventory summary from SSAS...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Average inventory</th>
                </tr>
              </thead>
              <tbody>
                {summary?.rows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{formatNumber(row.averageInventory)}</td>
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {breakdownError ? (
        <section className="status-panel error-panel">
          <strong>Inventory drill-down failed</strong>
          <p>{breakdownError}</p>
          <p className="muted">If summary works but drill-down fails, we should validate the Dim Time hierarchy path used in InventoryCube.</p>
        </section>
      ) : null}

      <SectionCard
        title="Guided time drill-down"
        description="This mirrors the Sales workflow, but keeps the inventory wording explicit because the measure is semi-additive."
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
          <p className="muted">Loading inventory time breakdown from SSAS...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{breakdown?.level === "year" ? "Year" : breakdown?.level === "quarter" ? "Quarter" : "Month"}</th>
                  <th>Average inventory</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {breakdown?.rows.map((row) => (
                  <tr key={`${breakdown.level}-${row.key}`}>
                    <td>{row.label}</td>
                    <td>{formatNumber(row.averageInventory)}</td>
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
        description="This page is designed around the current InventoryCube aggregate function AverageOfChildren."
      >
        <ul className="flat-list">
          <li>Show average inventory clearly, not ending inventory.</li>
          <li>Filter by product code, city, store, year, quarter, and month.</li>
          <li>Drill from region to city to store for stock investigation.</li>
        </ul>
      </SectionCard>

      {storeBreakdownError ? (
        <section className="status-panel error-panel">
          <strong>Inventory store drill-down failed</strong>
          <p>{storeBreakdownError}</p>
          <p className="muted">If time drill-down works but store drill-down fails, we should validate the Dim Store hierarchy path and member unique names returned from SSAS.</p>
        </section>
      ) : null}

      <SectionCard
        title="Guided store drill-down"
        description="This follows the Store hierarchy directly so inventory investigation can move from Bang to Thanhpho to Macuahang."
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
          <p className="muted">Loading inventory store breakdown from SSAS...</p>
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{storeBreakdown?.level === "state" ? "Bang" : storeBreakdown?.level === "city" ? "Thanh pho" : "Ma cua hang"}</th>
                  <th>Average inventory</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {storeBreakdown?.rows.map((row) => (
                  <tr key={`${storeBreakdown.level}-${row.memberUniqueName}`}>
                    <td>{row.label}</td>
                    <td>{formatNumber(row.averageInventory)}</td>
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
    </div>
  );
}
