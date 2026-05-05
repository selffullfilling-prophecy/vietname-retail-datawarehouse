import { useEffect, useMemo, useState } from "react";
import { AdvancedAnalysisToggle } from "../components/AdvancedAnalysisToggle";
import { BreadcrumbTrail } from "../components/BreadcrumbTrail";
import { DashboardPanel } from "../components/DashboardPanel";
import { ExecutiveKpiCard } from "../components/ExecutiveKpiCard";
import { InsightList } from "../components/InsightList";
import { InteractiveBarChart, type InteractiveChartDatum } from "../components/InteractiveBarChart";
import { InteractiveTrendChart } from "../components/InteractiveTrendChart";
import {
  getInventoryStoreBreakdown,
  getInventorySummaryByYear,
  getSalesCustomerBreakdown,
  getSalesStoreBreakdown,
  getSalesSummaryByYear,
  getSalesTimeBreakdown,
  type InventoryStoreBreakdownResponse,
  type SalesCustomerBreakdownResponse,
  type SalesStoreBreakdownResponse,
  type SalesTimeBreakdownResponse,
  type YearInventorySummaryResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

export function DashboardPage() {
  const [salesSummary, setSalesSummary] = useState<YearSalesSummaryResponse | null>(null);
  const [inventorySummary, setInventorySummary] = useState<YearInventorySummaryResponse | null>(null);
  const [salesAreas, setSalesAreas] = useState<SalesStoreBreakdownResponse | null>(null);
  const [inventoryAreas, setInventoryAreas] = useState<InventoryStoreBreakdownResponse | null>(null);
  const [customerAreas, setCustomerAreas] = useState<SalesCustomerBreakdownResponse | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTimeBreakdownResponse | null>(null);
  const [isCustomerUnavailable, setIsCustomerUnavailable] = useState(false);
  const [selectedYear, setSelectedYear] = useState("all");
  const [trendState, setTrendState] = useState<{ level: "year" | "quarter" | "month"; year?: string; quarter?: string }>({
    level: "year",
  });
  const [salesAreaState, setSalesAreaState] = useState<{
    level: "state" | "city" | "store";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [customerAreaState, setCustomerAreaState] = useState<{
    level: "state" | "city" | "customer";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [inventoryAreaState, setInventoryAreaState] = useState<{
    level: "state" | "city" | "store";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setIsLoading(true);
        setError(null);

        const [salesResponse, inventoryResponse] = await Promise.all([
          getSalesSummaryByYear(),
          getInventorySummaryByYear(),
        ]);

        if (!isMounted) {
          return;
        }

        setSalesSummary(salesResponse);
        setInventorySummary(inventoryResponse);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError("Không thể tải dữ liệu. Vui lòng kiểm tra API.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBreakdowns() {
      try {
        const yearFilter = selectedYear === "all" ? undefined : selectedYear;
        const customerAreaRequest = getSalesCustomerBreakdown(
          customerAreaState.level,
          customerAreaState.stateMemberUniqueName,
          customerAreaState.cityMemberUniqueName,
          yearFilter,
        )
          .then((response) => ({ response, unavailable: false }))
          .catch(() => ({ response: null, unavailable: true }));

        const [salesAreaResponse, inventoryAreaResponse, customerAreaResult] = await Promise.all([
          getSalesStoreBreakdown(
            salesAreaState.level,
            salesAreaState.stateMemberUniqueName,
            salesAreaState.cityMemberUniqueName,
            yearFilter,
          ),
          getInventoryStoreBreakdown(
            inventoryAreaState.level,
            inventoryAreaState.stateMemberUniqueName,
            inventoryAreaState.cityMemberUniqueName,
            yearFilter,
          ),
          customerAreaRequest,
        ]);

        if (!isMounted) {
          return;
        }

        setSalesAreas(salesAreaResponse);
        setInventoryAreas(inventoryAreaResponse);
        setCustomerAreas(customerAreaResult.response);
        setIsCustomerUnavailable(customerAreaResult.unavailable);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError("Không thể tải dữ liệu. Vui lòng kiểm tra API.");
      }
    }

    void loadBreakdowns();

    return () => {
      isMounted = false;
    };
  }, [customerAreaState, inventoryAreaState, salesAreaState, selectedYear]);

  useEffect(() => {
    let isMounted = true;

    async function loadTrend() {
      try {
        const response = await getSalesTimeBreakdown(trendState.level, trendState.year, trendState.quarter);

        if (isMounted) {
          setSalesTrend(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError("Không thể tải dữ liệu. Vui lòng kiểm tra API.");
        }
      }
    }

    void loadTrend();

    return () => {
      isMounted = false;
    };
  }, [trendState]);

  const years = salesSummary?.rows.map((row) => row.year) ?? [];
  const selectedSalesRow = useMemo(() => {
    if (!salesSummary?.rows.length) {
      return null;
    }

    return selectedYear === "all"
      ? salesSummary.rows[salesSummary.rows.length - 1] ?? null
      : salesSummary.rows.find((row) => row.year === selectedYear) ?? null;
  }, [salesSummary, selectedYear]);
  const previousSalesRow = useMemo(() => {
    if (!salesSummary?.rows.length || !selectedSalesRow) {
      return null;
    }

    const index = salesSummary.rows.findIndex((row) => row.year === selectedSalesRow.year);
    return index > 0 ? salesSummary.rows[index - 1] : null;
  }, [salesSummary, selectedSalesRow]);
  const selectedInventoryRow = useMemo(() => {
    if (!inventorySummary?.rows.length) {
      return null;
    }

    return selectedYear === "all"
      ? inventorySummary.rows[inventorySummary.rows.length - 1] ?? null
      : inventorySummary.rows.find((row) => row.year === selectedYear) ?? null;
  }, [inventorySummary, selectedYear]);
  const revenueGrowth = useMemo(() => {
    if (!selectedSalesRow || !previousSalesRow || previousSalesRow.revenue === 0) {
      return null;
    }

    return ((selectedSalesRow.revenue - previousSalesRow.revenue) / previousSalesRow.revenue) * 100;
  }, [previousSalesRow, selectedSalesRow]);
  const topRevenueAreas = useMemo(
    () => [...(salesAreas?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    [salesAreas],
  );
  const topCustomerAreas = useMemo(
    () => [...(customerAreas?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    [customerAreas],
  );
  const inventoryHotspots = useMemo(
    () =>
      [...(inventoryAreas?.rows ?? [])]
        .sort((left, right) => right.averageInventory - left.averageInventory)
        .slice(0, 5),
    [inventoryAreas],
  );
  const topRevenueArea = topRevenueAreas[0] ?? null;
  const topCustomerArea = topCustomerAreas[0] ?? null;
  const topInventoryArea = inventoryHotspots[0] ?? null;
  const customerUnavailableMessage = "Tính năng phân tích khách hàng đang chờ API customer-breakdown.";
  const salesAreaChartData = topRevenueAreas.map((row) => ({
    key: row.memberUniqueName,
    label: row.label,
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    canDrillDown: row.canDrillDown,
  }));
  const customerAreaChartData = topCustomerAreas.map((row) => ({
    key: row.memberUniqueName,
    label: row.label,
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    canDrillDown: row.canDrillDown,
  }));
  const inventoryAreaChartData = inventoryHotspots.map((row) => ({
    key: row.memberUniqueName,
    label: row.label,
    value: row.averageInventory,
    formattedValue: `${formatNumber(row.averageInventory)} đơn vị`,
    canDrillDown: row.canDrillDown,
  }));
  const salesTrendTotal = useMemo(
    () => (salesTrend?.rows ?? []).reduce((sum, row) => sum + row.revenue, 0),
    [salesTrend],
  );
  const salesTrendChartData = (salesTrend?.rows ?? []).map((row, index) => ({
    key: getTrendChartKey(row, index),
    label: getTrendDisplayLabel(row, index),
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    sharePercent: salesTrendTotal > 0 ? (row.revenue / salesTrendTotal) * 100 : undefined,
    sourceIndex: index,
    canDrillDown: row.canDrillDown,
  }));

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
  }

  function formatCurrencyCompact(value: number): string {
    if (value >= 1_000_000_000) {
      return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} tỷ VNĐ`;
    }

    if (value >= 1_000_000) {
      return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000)} triệu VNĐ`;
    }

    return `${formatNumber(value)} VNĐ`;
  }

  function resetAreaViews() {
    setSalesAreaState({ level: "state" });
    setCustomerAreaState({ level: "state" });
    setInventoryAreaState({ level: "state" });
  }

  function selectYear(year: string) {
    setSelectedYear(year);
    resetAreaViews();
    setTrendState(year === "all" ? { level: "year" } : { level: "quarter", year });
  }

  function getTrendQuarterNumber(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    const candidates = [row.label, row.key];
    for (const candidate of candidates) {
      const quarterMatch = candidate.match(/qu[ýy]\s*(\d)/i);
      if (quarterMatch?.[1]) {
        return quarterMatch[1];
      }

      const numbers = candidate.match(/\d+/g);
      const lastNumber = numbers?.[numbers.length - 1];
      if (lastNumber && Number(lastNumber) >= 1 && Number(lastNumber) <= 4) {
        return lastNumber;
      }
    }

    return String(index + 1);
  }

  function getTrendMonthNumber(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    const numbers = row.label.match(/\d+/g) ?? row.key.match(/\d+/g);
    const lastNumber = numbers?.[numbers.length - 1];
    return lastNumber && Number(lastNumber) >= 1 && Number(lastNumber) <= 12 ? lastNumber : String(index + 1);
  }

  function getTrendDisplayLabel(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    if (salesTrend?.level === "quarter") {
      const year = salesTrend.selectedYear ?? trendState.year ?? selectedYear;
      return year && year !== "all" ? `Quý ${getTrendQuarterNumber(row, index)}/${year}` : `Quý ${getTrendQuarterNumber(row, index)}`;
    }

    if (salesTrend?.level === "month") {
      const year = salesTrend.selectedYear ?? trendState.year;
      return year ? `Tháng ${getTrendMonthNumber(row, index)}/${year}` : row.label;
    }

    return row.label;
  }

  function getTrendChartKey(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    if (salesTrend?.level === "quarter") {
      return `quarter-${salesTrend.selectedYear ?? trendState.year ?? "all"}-${getTrendQuarterNumber(row, index)}`;
    }

    return `${salesTrend?.level ?? "time"}-${row.key}-${index}`;
  }

  function drillTrend(item: InteractiveChartDatum) {
    if (!salesTrend?.drillTargetLevel) {
      return;
    }

    const row = typeof item.sourceIndex === "number" ? salesTrend.rows[item.sourceIndex] : undefined;

    if (salesTrend.level === "year") {
      const year = row?.key ?? item.key;
      setSelectedYear(year);
      resetAreaViews();
      setTrendState({ level: "quarter", year });
      return;
    }

    if (salesTrend.level === "quarter" && salesTrend.selectedYear) {
      setTrendState({
        level: "month",
        year: salesTrend.selectedYear,
        quarter: row && typeof item.sourceIndex === "number" ? getTrendQuarterNumber(row, item.sourceIndex) : item.key,
      });
    }
  }

  function rollTrendUp() {
    if (trendState.level === "month" && trendState.year) {
      setTrendState({ level: "quarter", year: trendState.year });
      return;
    }

    resetTrend();
  }

  function resetTrend() {
    setSelectedYear("all");
    resetAreaViews();
    setTrendState({ level: "year" });
  }

  function drillSalesArea(item: InteractiveChartDatum) {
    if (!salesAreas?.drillTargetLevel) {
      return;
    }

    if (salesAreas.level === "state") {
      setSalesAreaState({ level: "city", stateMemberUniqueName: item.key, stateLabel: item.label });
      return;
    }

    if (salesAreas.level === "city") {
      setSalesAreaState({
        level: "store",
        stateMemberUniqueName: salesAreaState.stateMemberUniqueName,
        stateLabel: salesAreaState.stateLabel,
        cityMemberUniqueName: item.key,
        cityLabel: item.label,
      });
    }
  }

  function rollSalesAreaUp() {
    if (salesAreaState.level === "store") {
      setSalesAreaState({
        level: "city",
        stateMemberUniqueName: salesAreaState.stateMemberUniqueName,
        stateLabel: salesAreaState.stateLabel,
      });
      return;
    }

    setSalesAreaState({ level: "state" });
  }

  function drillCustomerArea(item: InteractiveChartDatum) {
    if (!customerAreas?.drillTargetLevel) {
      return;
    }

    if (customerAreas.level === "state") {
      setCustomerAreaState({ level: "city", stateMemberUniqueName: item.key, stateLabel: item.label });
      return;
    }

    if (customerAreas.level === "city") {
      setCustomerAreaState({
        level: "customer",
        stateMemberUniqueName: customerAreaState.stateMemberUniqueName,
        stateLabel: customerAreaState.stateLabel,
        cityMemberUniqueName: item.key,
        cityLabel: item.label,
      });
    }
  }

  function rollCustomerAreaUp() {
    if (customerAreaState.level === "customer") {
      setCustomerAreaState({
        level: "city",
        stateMemberUniqueName: customerAreaState.stateMemberUniqueName,
        stateLabel: customerAreaState.stateLabel,
      });
      return;
    }

    setCustomerAreaState({ level: "state" });
  }

  function drillInventoryArea(item: InteractiveChartDatum) {
    if (!inventoryAreas?.drillTargetLevel) {
      return;
    }

    if (inventoryAreas.level === "state") {
      setInventoryAreaState({ level: "city", stateMemberUniqueName: item.key, stateLabel: item.label });
      return;
    }

    if (inventoryAreas.level === "city") {
      setInventoryAreaState({
        level: "store",
        stateMemberUniqueName: inventoryAreaState.stateMemberUniqueName,
        stateLabel: inventoryAreaState.stateLabel,
        cityMemberUniqueName: item.key,
        cityLabel: item.label,
      });
    }
  }

  function rollInventoryAreaUp() {
    if (inventoryAreaState.level === "store") {
      setInventoryAreaState({
        level: "city",
        stateMemberUniqueName: inventoryAreaState.stateMemberUniqueName,
        stateLabel: inventoryAreaState.stateLabel,
      });
      return;
    }

    setInventoryAreaState({ level: "state" });
  }

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">TỔNG QUAN</p>
          <h2>Tổng quan điều hành</h2>
          <p className="muted">Theo dõi doanh thu, tồn kho và khách hàng từ hệ thống phân tích.</p>
        </div>
        <div className="year-filter-group">
          <span className="filter-group-label">Lọc nhanh</span>
          <div className="year-filter-bar" aria-label="Bộ lọc năm">
            <button
              type="button"
              className={`filter-pill ${selectedYear === "all" ? "filter-pill-active" : ""}`}
              onClick={() => selectYear("all")}
            >
              Toàn kỳ
            </button>
            {years.map((year) => (
              <button
                type="button"
                className={`filter-pill ${selectedYear === year ? "filter-pill-active" : ""}`}
                onClick={() => selectYear(year)}
                key={year}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error ? (
        <section className="status-panel error-panel">
          <strong>Không thể tải dữ liệu</strong>
          <p>{error}</p>
        </section>
      ) : null}

      <div className="executive-kpi-grid">
        <ExecutiveKpiCard
          label="Doanh thu"
          value={isLoading ? "Đang tải..." : selectedSalesRow ? formatCurrencyCompact(selectedSalesRow.revenue) : "--"}
          hint={selectedSalesRow ? `Năm ${selectedSalesRow.year}` : "Chưa có dữ liệu."}
          trendLabel={revenueGrowth === null ? undefined : `${revenueGrowth >= 0 ? "+" : "-"}${Math.abs(revenueGrowth).toFixed(1)}% so với năm trước`}
          trendDirection={revenueGrowth === null ? "flat" : revenueGrowth >= 0 ? "up" : "down"}
        />
        <ExecutiveKpiCard
          label="Sản lượng bán"
          value={selectedSalesRow ? `${formatNumber(selectedSalesRow.salesVolume)} đơn vị` : "--"}
          hint="Sản lượng theo năm đang xem."
        />
        <ExecutiveKpiCard
          label="Tồn kho trung bình"
          value={selectedInventoryRow ? `${formatNumber(selectedInventoryRow.averageInventory)} đơn vị` : "--"}
          hint="Dùng giá trị trung bình theo thời gian."
        />
        <ExecutiveKpiCard
          label="Khu vực dẫn đầu"
          value={topRevenueArea?.label ?? "--"}
          hint={topRevenueArea ? formatCurrencyCompact(topRevenueArea.revenue) : "Đang chờ dữ liệu."}
        />
        <ExecutiveKpiCard
          label="Khách hàng đóng góp lớn"
          value={topCustomerArea?.label ?? "--"}
          hint={topCustomerArea ? formatCurrencyCompact(topCustomerArea.revenue) : isCustomerUnavailable ? customerUnavailableMessage : "Đang chờ dữ liệu."}
        />
      </div>

      <div className="executive-main-grid">
        <DashboardPanel title="Xu hướng doanh thu" size="large">
          <div className="chart-panel-stack">
            <BreadcrumbTrail
              backLabel="Quay lại tổng quan"
              onBack={trendState.level !== "year" ? rollTrendUp : undefined}
              items={[
                { label: "Tổng quan", onClick: trendState.level !== "year" ? resetTrend : undefined },
                ...(trendState.year ? [{ label: trendState.year }] : []),
                ...(trendState.quarter && trendState.year ? [{ label: `Quý ${trendState.quarter}/${trendState.year}` }] : []),
              ]}
            />
            <InteractiveTrendChart
              ariaLabel="Xu hướng doanh thu"
              valueLabel="Doanh thu"
              secondaryLabel="Sản lượng bán"
              data={salesTrendChartData}
              onPointClick={drillTrend}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Top khu vực/cửa hàng theo doanh thu">
          <div className="chart-panel-stack">
            <BreadcrumbTrail
              backLabel="Quay lại"
              onBack={salesAreaState.level !== "state" ? rollSalesAreaUp : undefined}
              items={[
                { label: "Tổng quan", onClick: salesAreaState.level !== "state" ? () => setSalesAreaState({ level: "state" }) : undefined },
                ...(salesAreaState.stateLabel ? [{ label: salesAreaState.stateLabel }] : []),
                ...(salesAreaState.cityLabel ? [{ label: salesAreaState.cityLabel }] : []),
              ]}
            />
            <InteractiveBarChart
              data={salesAreaChartData}
              valueLabel="Doanh thu"
              secondaryLabel="Sản lượng bán"
              onDrillDown={drillSalesArea}
            />
          </div>
        </DashboardPanel>
      </div>

      <div className="executive-insight-grid">
        <DashboardPanel title="Khách hàng theo khu vực">
          <div className="insight-stack">
            <InsightList
              items={[
                {
                  label: "Khách hàng đóng góp lớn",
                  value: topCustomerArea?.label ?? "--",
                  description: topCustomerArea
                    ? `${formatCurrencyCompact(topCustomerArea.revenue)} doanh thu. Nên xem chi tiết theo thành phố và khách hàng.`
                    : isCustomerUnavailable
                      ? customerUnavailableMessage
                      : "Chưa có dữ liệu khách hàng.",
                },
              ]}
            />
            <BreadcrumbTrail
              backLabel="Quay lại"
              onBack={customerAreaState.level !== "state" ? rollCustomerAreaUp : undefined}
              items={[
                { label: "Tổng quan", onClick: customerAreaState.level !== "state" ? () => setCustomerAreaState({ level: "state" }) : undefined },
                ...(customerAreaState.stateLabel ? [{ label: customerAreaState.stateLabel }] : []),
                ...(customerAreaState.cityLabel ? [{ label: customerAreaState.cityLabel }] : []),
              ]}
            />
            <InteractiveBarChart
              data={customerAreaChartData}
              valueLabel="Doanh thu"
              secondaryLabel="Sản lượng bán"
              emptyLabel={isCustomerUnavailable ? customerUnavailableMessage : undefined}
              onDrillDown={drillCustomerArea}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Điểm cần chú ý về tồn kho">
          <div className="insight-stack">
            <InsightList
              items={[
                {
                  label: "Khu vực tồn kho cao",
                  value: topInventoryArea?.label ?? "--",
                  description: topInventoryArea
                    ? `${formatNumber(topInventoryArea.averageInventory)} đơn vị trung bình. Nên kiểm tra kế hoạch bán và bổ sung hàng.`
                    : "Chưa có dữ liệu tồn kho theo khu vực.",
                },
              ]}
            />
            <BreadcrumbTrail
              backLabel="Quay lại"
              onBack={inventoryAreaState.level !== "state" ? rollInventoryAreaUp : undefined}
              items={[
                { label: "Tổng quan", onClick: inventoryAreaState.level !== "state" ? () => setInventoryAreaState({ level: "state" }) : undefined },
                ...(inventoryAreaState.stateLabel ? [{ label: inventoryAreaState.stateLabel }] : []),
                ...(inventoryAreaState.cityLabel ? [{ label: inventoryAreaState.cityLabel }] : []),
              ]}
            />
            <InteractiveBarChart
              data={inventoryAreaChartData}
              valueLabel="Tồn kho trung bình"
              onDrillDown={drillInventoryArea}
            />
          </div>
        </DashboardPanel>
      </div>

      <AdvancedAnalysisToggle>
        <div className="data-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Năm</th>
                <th>Doanh thu</th>
                <th>Sản lượng</th>
                <th>Tồn kho trung bình</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary?.rows.map((salesRow) => {
                const inventoryRow = inventorySummary?.rows.find((row) => row.year === salesRow.year);

                return (
                  <tr key={salesRow.year}>
                    <td>{salesRow.year}</td>
                    <td>{formatCurrencyCompact(salesRow.revenue)}</td>
                    <td>{formatNumber(salesRow.salesVolume)} đơn vị</td>
                    <td>{inventoryRow ? `${formatNumber(inventoryRow.averageInventory)} đơn vị` : "--"}</td>
                  </tr>
                );
              }) ?? null}
            </tbody>
          </table>
        </div>
      </AdvancedAnalysisToggle>
    </div>
  );
}
