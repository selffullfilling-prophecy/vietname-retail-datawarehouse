import { useEffect, useMemo, useState } from "react";
import { AdvancedAnalysisToggle } from "../components/AdvancedAnalysisToggle";
import { BreadcrumbTrail } from "../components/BreadcrumbTrail";
import { DashboardPanel } from "../components/DashboardPanel";
import { ExecutiveKpiCard } from "../components/ExecutiveKpiCard";
import { InteractiveBarChart, type InteractiveChartDatum } from "../components/InteractiveBarChart";
import { InteractiveTrendChart } from "../components/InteractiveTrendChart";
import {
  getSalesCustomerBreakdown,
  getSalesPivot,
  getSalesStoreBreakdown,
  getSalesSummaryByYear,
  getSalesTimeBreakdown,
  type SalesCustomerBreakdownResponse,
  type SalesPivotResponse,
  type SalesStoreBreakdownResponse,
  type SalesTimeBreakdownResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

type SalesView = "time" | "store" | "customer" | "compare";

export function SalesPage() {
  const [summary, setSummary] = useState<YearSalesSummaryResponse | null>(null);
  const [timeBreakdown, setTimeBreakdown] = useState<SalesTimeBreakdownResponse | null>(null);
  const [storeBreakdown, setStoreBreakdown] = useState<SalesStoreBreakdownResponse | null>(null);
  const [customerBreakdown, setCustomerBreakdown] = useState<SalesCustomerBreakdownResponse | null>(null);
  const [comparison, setComparison] = useState<SalesPivotResponse | null>(null);
  const [isCustomerUnavailable, setIsCustomerUnavailable] = useState(false);
  const [activeView, setActiveView] = useState<SalesView>("time");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [timeState, setTimeState] = useState<{ level: "year" | "quarter" | "month"; year?: string; quarter?: string }>({
    level: "year",
  });
  const [storeState, setStoreState] = useState<{
    level: "state" | "city" | "store";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [customerState, setCustomerState] = useState<{
    level: "state" | "city" | "customer";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTimeYear = timeState.year ?? (selectedYear === "all" ? undefined : selectedYear);
  const activeTimeQuarter = timeState.level === "month" ? timeState.quarter : undefined;
  const storeFilter = {
    stateMemberUniqueName: storeState.stateMemberUniqueName,
    cityMemberUniqueName: storeState.cityMemberUniqueName,
  };

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getSalesSummaryByYear();

        if (!isMounted) {
          return;
        }

        setSummary(response);
      } catch (loadError) {
        if (isMounted) {
          setError("Không thể tải dữ liệu. Vui lòng kiểm tra API.");
        }
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

    async function loadSalesViews() {
      try {
        setError(null);
        const customerRequest = getSalesCustomerBreakdown(
          customerState.level,
          customerState.stateMemberUniqueName,
          customerState.cityMemberUniqueName,
          activeTimeYear,
          activeTimeQuarter,
        )
          .then((response) => ({ response, unavailable: false }))
          .catch(() => ({ response: null, unavailable: true }));

        const [timeResponse, storeResponse, customerResult, comparisonResponse] = await Promise.all([
          getSalesTimeBreakdown(
            timeState.level,
            timeState.year,
            timeState.quarter,
            storeFilter.stateMemberUniqueName,
            storeFilter.cityMemberUniqueName,
          ),
          getSalesStoreBreakdown(
            storeState.level,
            storeState.stateMemberUniqueName,
            storeState.cityMemberUniqueName,
            activeTimeYear,
            activeTimeQuarter,
          ),
          customerRequest,
          getSalesPivot(
            timeState.level,
            storeState.level,
            timeState.year,
            activeTimeQuarter,
            storeState.stateMemberUniqueName,
            storeState.cityMemberUniqueName,
          ),
        ]);

        if (!isMounted) {
          return;
        }

        setTimeBreakdown(timeResponse);
        setStoreBreakdown(storeResponse);
        setCustomerBreakdown(customerResult.response);
        setIsCustomerUnavailable(customerResult.unavailable);
        setComparison(comparisonResponse);
      } catch (loadError) {
        if (isMounted) {
          setError("Không thể tải dữ liệu. Vui lòng kiểm tra API.");
        }
      }
    }

    void loadSalesViews();

    return () => {
      isMounted = false;
    };
  }, [activeTimeQuarter, activeTimeYear, customerState, storeFilter.cityMemberUniqueName, storeFilter.stateMemberUniqueName, storeState, timeState]);

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
  const revenueGrowth = useMemo(() => {
    if (!selectedSummary || !previousSummary || previousSummary.revenue === 0) {
      return null;
    }

    return ((selectedSummary.revenue - previousSummary.revenue) / previousSummary.revenue) * 100;
  }, [previousSummary, selectedSummary]);
  const topStores = useMemo(
    () => [...(storeBreakdown?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    [storeBreakdown],
  );
  const topCustomers = useMemo(
    () => [...(customerBreakdown?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    [customerBreakdown],
  );
  const comparisonRows =
    comparison?.timeAxis.slice(0, 6).map((row, index) => ({
      ...row,
      label: getComparisonTimeLabel(row.label, index),
    })) ?? [];
  const comparisonColumns = comparison?.storeAxis.slice(0, 5) ?? [];
  const comparisonCellMap = useMemo(() => {
    const entries = comparison?.cells.map((cell) => [`${cell.timeKey}::${cell.storeKey}`, cell] as const) ?? [];
    return new Map(entries);
  }, [comparison]);
  const timeBreakdownTotal = useMemo(
    () => (timeBreakdown?.rows ?? []).reduce((sum, row) => sum + row.revenue, 0),
    [timeBreakdown],
  );
  const timeBreakdownChartData = (timeBreakdown?.rows ?? []).map((row, index) => ({
    key: getTimeChartKey(row, index),
    label: getTimeDisplayLabel(row, index),
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    sharePercent: timeBreakdownTotal > 0 ? (row.revenue / timeBreakdownTotal) * 100 : undefined,
    sourceIndex: index,
    canDrillDown: row.canDrillDown,
  }));
  const storeChartData = topStores.map((row) => ({
    key: row.memberUniqueName,
    label: row.label,
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    canDrillDown: row.canDrillDown,
  }));
  const customerChartData = topCustomers.map((row) => ({
    key: row.memberUniqueName,
    label: row.label,
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    canDrillDown: row.canDrillDown,
  }));
  const customerUnavailableMessage = "Tính năng phân tích khách hàng đang chờ API customer-breakdown.";

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

  function getComparisonTimeLabel(label: string, index: number) {
    if (comparison?.timeLevel === "quarter") {
      const quarterNumber = Number(label) >= 1 && Number(label) <= 4 ? label : String(index + 1);
      return comparison.selectedYear ? `Quý ${quarterNumber}/${comparison.selectedYear}` : `Quý ${quarterNumber}`;
    }

    if (comparison?.timeLevel === "month") {
      const monthNumber = Number(label) >= 1 && Number(label) <= 12 ? label : String(index + 1);
      return comparison.selectedYear ? `Tháng ${monthNumber}/${comparison.selectedYear}` : `Tháng ${monthNumber}`;
    }

    return label;
  }

  function selectYear(year: string) {
    setSelectedYear(year);
    setTimeState(year === "all" ? { level: "year" } : { level: "quarter", year });
    setStoreState({ level: "state" });
    setCustomerState({ level: "state" });
  }

  function getQuarterNumber(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
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

  function getMonthNumber(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    const numbers = row.label.match(/\d+/g) ?? row.key.match(/\d+/g);
    const lastNumber = numbers?.[numbers.length - 1];
    return lastNumber && Number(lastNumber) >= 1 && Number(lastNumber) <= 12 ? lastNumber : String(index + 1);
  }

  function getTimeDisplayLabel(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    if (timeBreakdown?.level === "quarter") {
      const year = timeBreakdown.selectedYear ?? timeState.year ?? selectedYear;
      return year && year !== "all" ? `Quý ${getQuarterNumber(row, index)}/${year}` : `Quý ${getQuarterNumber(row, index)}`;
    }

    if (timeBreakdown?.level === "month") {
      const year = timeBreakdown.selectedYear ?? timeState.year;
      return year ? `Tháng ${getMonthNumber(row, index)}/${year}` : row.label;
    }

    return row.label;
  }

  function getTimeChartKey(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    if (timeBreakdown?.level === "quarter") {
      return `quarter-${timeBreakdown.selectedYear ?? timeState.year ?? "all"}-${getQuarterNumber(row, index)}`;
    }

    return `${timeBreakdown?.level ?? "time"}-${row.key}-${index}`;
  }

  function drillTime(row: SalesTimeBreakdownResponse["rows"][number], index: number) {
    if (!timeBreakdown?.drillTargetLevel) {
      return;
    }

    if (timeBreakdown.level === "year") {
      setTimeState({ level: "quarter", year: row.key });
      setSelectedYear(row.key);
      return;
    }

    if (timeBreakdown.level === "quarter" && timeBreakdown.selectedYear) {
      setTimeState({
        level: "month",
        year: timeBreakdown.selectedYear,
        quarter: getQuarterNumber(row, index),
      });
    }
  }

  function drillTimeChart(item: InteractiveChartDatum) {
    const row = typeof item.sourceIndex === "number" ? timeBreakdown?.rows[item.sourceIndex] : undefined;
    if (row && typeof item.sourceIndex === "number") {
      drillTime(row, item.sourceIndex);
      return;
    }

    if (timeState.level === "year") {
      setTimeState({ level: "quarter", year: item.key });
      setSelectedYear(item.key);
    }
  }

  function rollTimeUp() {
    if (timeState.level === "month" && timeState.year) {
      setTimeState({ level: "quarter", year: timeState.year });
      setSelectedYear(timeState.year);
      return;
    }

    setSelectedYear("all");
    setTimeState({ level: "year" });
  }

  function resetTimeContext() {
    setSelectedYear("all");
    setTimeState({ level: "year" });
  }

  function drillStore(row: SalesStoreBreakdownResponse["rows"][number]) {
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

  function resetStoreContext() {
    setStoreState({ level: "state" });
  }

  function drillCustomer(row: SalesCustomerBreakdownResponse["rows"][number]) {
    if (!customerBreakdown?.drillTargetLevel) {
      return;
    }

    if (customerBreakdown.level === "state") {
      setCustomerState({ level: "city", stateMemberUniqueName: row.memberUniqueName, stateLabel: row.label });
      return;
    }

    if (customerBreakdown.level === "city") {
      setCustomerState({
        level: "customer",
        stateMemberUniqueName: customerState.stateMemberUniqueName,
        stateLabel: customerState.stateLabel,
        cityMemberUniqueName: row.memberUniqueName,
        cityLabel: row.label,
      });
    }
  }

  function drillCustomerChart(item: InteractiveChartDatum) {
    const row = customerBreakdown?.rows.find((candidate) => candidate.memberUniqueName === item.key);
    if (row) {
      drillCustomer(row);
    }
  }

  function rollCustomerUp() {
    if (customerState.level === "customer") {
      setCustomerState({
        level: "city",
        stateMemberUniqueName: customerState.stateMemberUniqueName,
        stateLabel: customerState.stateLabel,
      });
      return;
    }

    setCustomerState({ level: "state" });
  }

  function resetCustomerContext() {
    setCustomerState({ level: "state" });
  }

  function resetAllContexts() {
    resetTimeContext();
    resetStoreContext();
    resetCustomerContext();
  }

  function getActiveTimeLabel() {
    if (timeState.level === "month" && timeState.year && timeState.quarter) {
      return `${timeState.year} > Quý ${timeState.quarter}`;
    }

    if (timeState.year) {
      return timeState.year;
    }

    return null;
  }

  function getActiveStoreLabel() {
    if (storeState.cityLabel) {
      return `${storeState.stateLabel ?? "Khu vực"} > ${storeState.cityLabel}`;
    }

    return storeState.stateLabel ?? null;
  }

  function getTimeLabel(level: SalesTimeBreakdownResponse["level"] | undefined) {
    if (level === "quarter") {
      return "Quý";
    }

    if (level === "month") {
      return "Tháng";
    }

    return "Năm";
  }

  function getStoreLabel(level: SalesStoreBreakdownResponse["level"] | undefined) {
    if (level === "city") {
      return "Thành phố";
    }

    if (level === "store") {
      return "Cửa hàng";
    }

    return "Khu vực";
  }

  function getCustomerLabel(level: SalesCustomerBreakdownResponse["level"] | undefined) {
    if (level === "city") {
      return "Thành phố";
    }

    if (level === "customer") {
      return "Khách hàng";
    }

    return "Khu vực";
  }

  const activeTimeLabel = getActiveTimeLabel();
  const activeStoreLabel = getActiveStoreLabel();
  const hasActiveContext = Boolean(activeTimeLabel || activeStoreLabel);

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">DOANH THU</p>
          <h2>Theo dõi doanh thu theo thời gian, khu vực và khách hàng</h2>
          <p className="muted">Màn hình mặc định dùng ngôn ngữ kinh doanh; bảng phân tích nâng cao được ẩn riêng.</p>
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
          label="Doanh thu"
          value={isLoading ? "Đang tải..." : selectedSummary ? formatCurrencyCompact(selectedSummary.revenue) : "--"}
          hint={selectedSummary ? `Năm ${selectedSummary.year}` : "Chưa có dữ liệu."}
        />
        <ExecutiveKpiCard
          label="Tăng/giảm"
          value={revenueGrowth === null ? "--" : `${revenueGrowth >= 0 ? "+" : "-"}${Math.abs(revenueGrowth).toFixed(1)}%`}
          trendLabel={revenueGrowth === null ? "Cần thêm dữ liệu" : "So với năm trước"}
          trendDirection={revenueGrowth === null ? "flat" : revenueGrowth >= 0 ? "up" : "down"}
        />
        <ExecutiveKpiCard
          label="Sản lượng bán"
          value={selectedSummary ? `${formatNumber(selectedSummary.salesVolume)} đơn vị` : "--"}
          hint="Theo năm đang xem."
        />
        <ExecutiveKpiCard
          label="Khách hàng đóng góp lớn"
          value={topCustomers[0]?.label ?? "--"}
          hint={topCustomers[0] ? formatCurrencyCompact(topCustomers[0].revenue) : isCustomerUnavailable ? customerUnavailableMessage : "Đang chờ dữ liệu."}
        />
      </div>

      <div className="segmented-control" aria-label="Xem theo">
        <button type="button" className={activeView === "time" ? "active" : ""} onClick={() => setActiveView("time")}>
          Theo thời gian
        </button>
        <button type="button" className={activeView === "store" ? "active" : ""} onClick={() => setActiveView("store")}>
          Theo khu vực cửa hàng
        </button>
        <button type="button" className={activeView === "customer" ? "active" : ""} onClick={() => setActiveView("customer")}>
          Theo khách hàng
        </button>
        <button type="button" className={activeView === "compare" ? "active" : ""} onClick={() => setActiveView("compare")}>
          So sánh 2 chiều
        </button>
      </div>

      {hasActiveContext ? (
        <div className="context-chip-row" aria-label="Bộ lọc đang áp dụng">
          {activeTimeLabel ? (
            <span className="context-chip">
              <strong>Thời gian:</strong> {activeTimeLabel}
              <button type="button" onClick={resetTimeContext}>
                Bỏ lọc thời gian
              </button>
            </span>
          ) : null}
          {activeStoreLabel ? (
            <span className="context-chip">
              <strong>Khu vực:</strong> {activeStoreLabel}
              <button type="button" onClick={resetStoreContext}>
                Bỏ lọc khu vực
              </button>
            </span>
          ) : null}
          <button type="button" className="secondary-button" onClick={resetAllContexts}>
            Quay lại tổng quan
          </button>
        </div>
      ) : null}

      {activeView === "time" ? (
        <div className="executive-main-grid">
          <DashboardPanel title="Xu hướng doanh thu" size="large">
            <InteractiveTrendChart
              ariaLabel="Xu hướng doanh thu"
              data={timeBreakdownChartData}
              valueLabel="Doanh thu"
              secondaryLabel="Sản lượng bán"
              onPointClick={drillTimeChart}
            />
          </DashboardPanel>
          <DashboardPanel title={`Chi tiết theo ${getTimeLabel(timeBreakdown?.level).toLowerCase()}`}>
            <div className="chart-panel-stack">
              <BreadcrumbTrail
                backLabel="Quay lại cấp trước"
                onBack={timeState.level !== "year" ? rollTimeUp : undefined}
                items={[
                  { label: "Tổng quan", onClick: timeState.level !== "year" ? resetTimeContext : undefined },
                  ...(timeState.year ? [{ label: timeState.year }] : []),
                  ...(timeState.quarter && timeState.year ? [{ label: `Quý ${timeState.quarter}/${timeState.year}` }] : []),
                ]}
              />
              <InteractiveBarChart
                data={timeBreakdownChartData}
                valueLabel="Doanh thu"
                secondaryLabel="Sản lượng bán"
                onDrillDown={drillTimeChart}
              />
            </div>
            <div className="data-table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{getTimeLabel(timeBreakdown?.level)}</th>
                    <th>Doanh thu</th>
                    <th>Sản lượng</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {timeBreakdown?.rows.map((row, index) => (
                    <tr key={`${timeBreakdown.level}-${row.key}-${index}`}>
                      <td>{getTimeDisplayLabel(row, index)}</td>
                      <td>{formatCurrencyCompact(row.revenue)}</td>
                      <td>{formatNumber(row.salesVolume)} đơn vị</td>
                      <td>
                        {row.canDrillDown ? (
                          <button type="button" className="secondary-button" onClick={() => drillTime(row, index)}>
                            Xem chi tiết
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )) ?? null}
                </tbody>
              </table>
            </div>
          </DashboardPanel>
        </div>
      ) : null}

      {activeView === "store" ? (
        <DashboardPanel title={`Doanh thu theo ${getStoreLabel(storeBreakdown?.level).toLowerCase()}`}>
          <div className="chart-panel-stack">
            <div className="section-action-row">
              <BreadcrumbTrail
                backLabel="Quay lại cấp trước"
                onBack={storeState.level !== "state" ? rollStoreUp : undefined}
                items={[
                  { label: "Tổng quan", onClick: storeState.level !== "state" ? resetStoreContext : undefined },
                  ...(storeState.stateLabel ? [{ label: storeState.stateLabel }] : []),
                  ...(storeState.cityLabel ? [{ label: storeState.cityLabel }] : []),
                ]}
              />
              <span className="muted">Lọc nhanh theo năm đang chọn.</span>
            </div>
            <InteractiveBarChart
              data={storeChartData}
              valueLabel="Doanh thu"
              secondaryLabel="Sản lượng bán"
              onDrillDown={drillStoreChart}
            />
          </div>
          <DetailTable rows={storeBreakdown?.rows ?? []} onDetail={drillStore} formatCurrency={formatCurrencyCompact} formatNumber={formatNumber} />
        </DashboardPanel>
      ) : null}

      {activeView === "customer" ? (
        <DashboardPanel title="Khách hàng theo khu vực">
          <div className="chart-panel-stack">
            <div className="section-action-row">
              <BreadcrumbTrail
                backLabel="Quay lại cấp trước"
                onBack={customerState.level !== "state" ? rollCustomerUp : undefined}
                items={[
                  { label: "Tổng quan", onClick: customerState.level !== "state" ? resetCustomerContext : undefined },
                  ...(customerState.stateLabel ? [{ label: customerState.stateLabel }] : []),
                  ...(customerState.cityLabel ? [{ label: customerState.cityLabel }] : []),
                ]}
              />
              <span className="muted">{getCustomerLabel(customerBreakdown?.level)} đang được hiển thị.</span>
            </div>
            <InteractiveBarChart
              data={customerChartData}
              valueLabel="Doanh thu"
              secondaryLabel="Sản lượng bán"
              emptyLabel={isCustomerUnavailable ? customerUnavailableMessage : undefined}
              onDrillDown={drillCustomerChart}
            />
          </div>
          {isCustomerUnavailable ? <p className="muted panel-placeholder">{customerUnavailableMessage}</p> : null}
          <DetailTable rows={customerBreakdown?.rows ?? []} onDetail={drillCustomer} formatCurrency={formatCurrencyCompact} formatNumber={formatNumber} />
        </DashboardPanel>
      ) : null}

      {activeView === "compare" ? (
        <DashboardPanel title="So sánh 2 chiều">
          <p className="muted">So sánh doanh thu giữa năm và khu vực cửa hàng.</p>
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
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
                      return <td key={column.key}>{cell ? formatCurrencyCompact(cell.revenue) : "--"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      <AdvancedAnalysisToggle>
        <div className="data-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Năm</th>
                <th>Doanh thu</th>
                <th>Sản lượng bán</th>
              </tr>
            </thead>
            <tbody>
              {summary?.rows.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{formatCurrencyCompact(row.revenue)}</td>
                  <td>{formatNumber(row.salesVolume)} đơn vị</td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </AdvancedAnalysisToggle>
    </div>
  );
}

type DetailRow = {
  label: string;
  memberUniqueName: string;
  revenue: number;
  salesVolume: number;
  canDrillDown: boolean;
};

type DetailTableProps<T extends DetailRow> = {
  rows: T[];
  onDetail: (row: T) => void;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
};

function DetailTable<T extends DetailRow>({ rows, onDetail, formatCurrency, formatNumber }: DetailTableProps<T>) {
  return (
    <div className="data-table-shell executive-detail-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Doanh thu</th>
            <th>Sản lượng</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.memberUniqueName}>
              <td>{row.label}</td>
              <td>{formatCurrency(row.revenue)}</td>
              <td>{formatNumber(row.salesVolume)} đơn vị</td>
              <td>
                {row.canDrillDown ? (
                  <button type="button" className="secondary-button" onClick={() => onDetail(row)}>
                    Xem chi tiết
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
