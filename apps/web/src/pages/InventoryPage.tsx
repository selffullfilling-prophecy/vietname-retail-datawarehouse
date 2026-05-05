import { useEffect, useMemo, useState } from "react";
import { AdvancedAnalysisToggle } from "../components/AdvancedAnalysisToggle";
import { BreadcrumbTrail } from "../components/BreadcrumbTrail";
import { DashboardPanel } from "../components/DashboardPanel";
import { ExecutiveKpiCard } from "../components/ExecutiveKpiCard";
import { InsightList } from "../components/InsightList";
import { InteractiveBarChart, type InteractiveChartDatum } from "../components/InteractiveBarChart";
import { InteractiveTrendChart } from "../components/InteractiveTrendChart";
import {
  getInventoryPivot,
  getInventoryStoreBreakdown,
  getInventorySummaryByYear,
  getInventoryTimeBreakdown,
  type InventoryPivotResponse,
  type InventoryStoreBreakdownResponse,
  type InventoryTimeBreakdownResponse,
  type YearInventorySummaryResponse,
} from "../services/api";

export function InventoryPage() {
  const [summary, setSummary] = useState<YearInventorySummaryResponse | null>(null);
  const [timeBreakdown, setTimeBreakdown] = useState<InventoryTimeBreakdownResponse | null>(null);
  const [storeBreakdown, setStoreBreakdown] = useState<InventoryStoreBreakdownResponse | null>(null);
  const [comparison, setComparison] = useState<InventoryPivotResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState("all");
  const [storeState, setStoreState] = useState<{
    level: "state" | "city" | "store";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [error, setError] = useState<string | null>(null);

  const yearFilter = selectedYear === "all" ? undefined : selectedYear;

  useEffect(() => {
    let isMounted = true;

    async function loadInventory() {
      try {
        setError(null);
        const [summaryResponse, timeResponse, storeResponse, comparisonResponse] = await Promise.all([
          getInventorySummaryByYear(),
          getInventoryTimeBreakdown("year"),
          getInventoryStoreBreakdown(storeState.level, storeState.stateMemberUniqueName, storeState.cityMemberUniqueName, yearFilter),
          getInventoryPivot("year", "state"),
        ]);

        if (!isMounted) {
          return;
        }

        setSummary(summaryResponse);
        setTimeBreakdown(timeResponse);
        setStoreBreakdown(storeResponse);
        setComparison(comparisonResponse);
      } catch (loadError) {
        if (isMounted) {
          setError("Không thể tải dữ liệu. Vui lòng kiểm tra API.");
        }
      }
    }

    void loadInventory();

    return () => {
      isMounted = false;
    };
  }, [storeState, yearFilter]);

  const years = summary?.rows.map((row) => row.year) ?? [];
  const selectedSummary = useMemo(() => {
    if (!summary?.rows.length) {
      return null;
    }

    return selectedYear === "all"
      ? summary.rows[summary.rows.length - 1] ?? null
      : summary.rows.find((row) => row.year === selectedYear) ?? null;
  }, [summary, selectedYear]);
  const previousSummary = useMemo(() => {
    if (!summary?.rows.length || !selectedSummary) {
      return null;
    }

    const index = summary.rows.findIndex((row) => row.year === selectedSummary.year);
    return index > 0 ? summary.rows[index - 1] : null;
  }, [summary, selectedSummary]);
  const inventoryChange = useMemo(() => {
    if (!selectedSummary || !previousSummary || previousSummary.averageInventory === 0) {
      return null;
    }

    return ((selectedSummary.averageInventory - previousSummary.averageInventory) / previousSummary.averageInventory) * 100;
  }, [previousSummary, selectedSummary]);
  const hotspots = useMemo(
    () =>
      [...(storeBreakdown?.rows ?? [])]
        .sort((left, right) => right.averageInventory - left.averageInventory)
        .slice(0, 8),
    [storeBreakdown],
  );
  const topHotspot = hotspots[0] ?? null;
  const comparisonRows = comparison?.timeAxis.slice(0, 6) ?? [];
  const comparisonColumns = comparison?.storeAxis.slice(0, 5) ?? [];
  const comparisonCellMap = useMemo(() => {
    const entries = comparison?.cells.map((cell) => [`${cell.timeKey}::${cell.storeKey}`, cell] as const) ?? [];
    return new Map(entries);
  }, [comparison]);
  const trendChartData = (timeBreakdown?.rows ?? []).map((row) => ({
    key: row.key,
    label: row.label,
    value: row.averageInventory,
    formattedValue: `${formatNumber(row.averageInventory)} đơn vị`,
    canDrillDown: false,
  }));
  const storeChartData = hotspots.slice(0, 5).map((row) => ({
    key: row.memberUniqueName,
    label: row.label,
    value: row.averageInventory,
    formattedValue: `${formatNumber(row.averageInventory)} đơn vị`,
    canDrillDown: row.canDrillDown,
  }));

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
  }

  function selectYear(year: string) {
    setSelectedYear(year);
    setStoreState({ level: "state" });
  }

  function drillStore(row: InventoryStoreBreakdownResponse["rows"][number]) {
    if (!storeBreakdown?.drillTargetLevel) {
      return;
    }

    if (storeBreakdown.level === "state") {
      setStoreState({ level: "city", stateMemberUniqueName: row.memberUniqueName, stateLabel: row.label });
      return;
    }

    if (storeBreakdown.level === "city") {
      setStoreState({
        level: "store",
        stateMemberUniqueName: storeState.stateMemberUniqueName,
        stateLabel: storeState.stateLabel,
        cityMemberUniqueName: row.memberUniqueName,
        cityLabel: row.label,
      });
    }
  }

  function drillStoreChart(item: InteractiveChartDatum) {
    const row = storeBreakdown?.rows.find((candidate) => candidate.memberUniqueName === item.key);
    if (row) {
      drillStore(row);
    }
  }

  function rollStoreUp() {
    if (storeState.level === "store") {
      setStoreState({ level: "city", stateMemberUniqueName: storeState.stateMemberUniqueName, stateLabel: storeState.stateLabel });
      return;
    }

    setStoreState({ level: "state" });
  }

  function storeLabel() {
    if (storeState.level === "city") {
      return "Thành phố";
    }

    if (storeState.level === "store") {
      return "Cửa hàng";
    }

    return "Khu vực";
  }

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">TỒN KHO</p>
          <h2>Tồn kho trung bình và điểm cần chú ý</h2>
          <p className="muted">Tập trung vào rủi ro tồn kho cao theo khu vực và cửa hàng.</p>
        </div>
        <div className="year-filter-group">
          <span className="filter-group-label">Lọc nhanh</span>
          <div className="year-filter-bar">
            <button type="button" className={`filter-pill ${selectedYear === "all" ? "filter-pill-active" : ""}`} onClick={() => selectYear("all")}>
              Toàn kỳ
            </button>
            {years.map((year) => (
              <button type="button" className={`filter-pill ${selectedYear === year ? "filter-pill-active" : ""}`} onClick={() => selectYear(year)} key={year}>
                {year}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error ? <p className="compact-error-text">{error}</p> : null}

      <div className="executive-kpi-grid four-up">
        <ExecutiveKpiCard
          label="Tồn kho trung bình"
          value={selectedSummary ? `${formatNumber(selectedSummary.averageInventory)} đơn vị` : "--"}
          hint={selectedSummary ? `Năm ${selectedSummary.year}` : "Chưa có dữ liệu."}
        />
        <ExecutiveKpiCard
          label="Tăng/giảm tồn kho"
          value={inventoryChange === null ? "--" : `${inventoryChange >= 0 ? "+" : "-"}${Math.abs(inventoryChange).toFixed(1)}%`}
          trendLabel="So với năm trước"
          trendDirection={inventoryChange === null ? "flat" : inventoryChange > 0 ? "down" : "up"}
        />
        <ExecutiveKpiCard
          label="Khu vực tồn kho cao"
          value={topHotspot?.label ?? "--"}
          hint={topHotspot ? `${formatNumber(topHotspot.averageInventory)} đơn vị` : "Đang chờ dữ liệu."}
        />
        <ExecutiveKpiCard
          label="Phạm vi đang xem"
          value={storeLabel()}
          hint="Theo khu vực, thành phố hoặc cửa hàng."
        />
      </div>

      <div className="executive-main-grid">
        <DashboardPanel title="Xu hướng tồn kho" size="large">
          <InteractiveTrendChart
            ariaLabel="Xu hướng tồn kho trung bình"
            data={trendChartData}
            valueLabel="Tồn kho trung bình"
          />
        </DashboardPanel>

        <DashboardPanel title={`Tồn kho cao theo ${storeLabel().toLowerCase()}`}>
          <div className="chart-panel-stack">
            <div className="section-action-row">
              <BreadcrumbTrail
                backLabel="Quay lại tổng quan"
                onBack={storeState.level !== "state" ? rollStoreUp : undefined}
                items={[
                  { label: "Tổng quan", onClick: storeState.level !== "state" ? () => setStoreState({ level: "state" }) : undefined },
                  ...(storeState.stateLabel ? [{ label: storeState.stateLabel }] : []),
                  ...(storeState.cityLabel ? [{ label: storeState.cityLabel }] : []),
                ]}
              />
              <span className="muted">Lọc nhanh theo năm đang chọn.</span>
            </div>
            <InteractiveBarChart
              data={storeChartData}
              valueLabel="Tồn kho trung bình"
              onDrillDown={drillStoreChart}
            />
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Điểm cần chú ý">
        <div className="inventory-risk-grid">
          <InsightList
            items={[
              {
                label: "Ưu tiên kiểm tra",
                value: topHotspot?.label ?? "--",
                description: topHotspot
                  ? `${formatNumber(topHotspot.averageInventory)} đơn vị trung bình. Cần rà soát kế hoạch bán, chuyển hàng hoặc khuyến mãi.`
                  : "Chưa có dữ liệu rủi ro tồn kho.",
              },
            ]}
          />
          <div className="data-table-shell executive-detail-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{storeLabel()}</th>
                  <th>Tồn kho trung bình</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((row) => (
                  <tr key={row.memberUniqueName}>
                    <td>{row.label}</td>
                    <td>{formatNumber(row.averageInventory)} đơn vị</td>
                    <td>
                      {row.canDrillDown ? (
                        <button type="button" className="secondary-button" onClick={() => drillStore(row)}>
                          Xem chi tiết
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardPanel>

      <AdvancedAnalysisToggle>
        <div className="data-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Năm</th>
                {comparisonColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {comparisonColumns.map((column) => {
                    const cell = comparisonCellMap.get(`${row.key}::${column.key}`);
                    return <td key={column.key}>{cell ? `${formatNumber(cell.averageInventory)} đơn vị` : "--"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdvancedAnalysisToggle>
    </div>
  );
}
