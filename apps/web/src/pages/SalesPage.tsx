import { useEffect, useMemo, useState } from "react";
import { InteractiveBarChart, type InteractiveChartDatum } from "../components/InteractiveBarChart";
import { InteractiveTrendChart, type InteractiveTrendDatum } from "../components/InteractiveTrendChart";
import { KpiCard } from "../components/KpiCard";
import { QuickTimeFilter } from "../components/QuickTimeFilter";
import { SectionCard } from "../components/SectionCard";
import {
  getSalesStoreBreakdown,
  getSalesSummaryByYear,
  getSalesTimeBreakdown,
  type SalesStoreBreakdownResponse,
  type SalesTimeBreakdownResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

type TimeState = {
  level: "year" | "quarter" | "month";
  year?: string;
  quarter?: string;
};

type LocationState = {
  stateMemberUniqueName?: string;
  cityMemberUniqueName?: string;
  storeMemberUniqueName?: string;
  stateLabel?: string;
  cityLabel?: string;
  storeLabel?: string;
};

type YearChange = {
  percent: number;
  currentYear: string;
  previousYear: string;
};

const QUICK_TIME_YEARS = ["2022", "2023", "2024", "2025"];

export function SalesPage() {
  const [summary, setSummary] = useState<YearSalesSummaryResponse | null>(null);
  const [timeBreakdown, setTimeBreakdown] = useState<SalesTimeBreakdownResponse | null>(null);
  const [yearComparisonBreakdown, setYearComparisonBreakdown] = useState<SalesTimeBreakdownResponse | null>(null);
  const [locationBreakdown, setLocationBreakdown] = useState<SalesStoreBreakdownResponse | null>(null);
  const [timeState, setTimeState] = useState<TimeState>({ level: "year" });
  const [locationState, setLocationState] = useState<LocationState>({});
  const [locationSearch, setLocationSearch] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isTimeLoading, setIsTimeLoading] = useState(true);
  const [isComparisonLoading, setIsComparisonLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationLevel = getLocationLevel(locationState);
  const activeTimeYear = timeState.level === "quarter" || timeState.level === "month" ? timeState.year : undefined;
  const activeTimeQuarter = timeState.level === "month" ? timeState.quarter : undefined;

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setIsSummaryLoading(true);
        const response = await getSalesSummaryByYear();

        if (isMounted) {
          setSummary(response);
        }
      } catch {
        if (isMounted) {
          setError("Không thể tải dữ liệu doanh thu. Vui lòng kiểm tra API.");
        }
      } finally {
        if (isMounted) {
          setIsSummaryLoading(false);
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

    async function loadTimeBreakdown() {
      try {
        setIsTimeLoading(true);
        setError(null);
        const response = await getSalesTimeBreakdown(
          timeState.level,
          timeState.year,
          timeState.quarter,
          locationState.stateMemberUniqueName,
          locationState.cityMemberUniqueName,
          locationState.storeMemberUniqueName,
        );

        if (isMounted) {
          setTimeBreakdown(response);
        }
      } catch {
        if (isMounted) {
          setError("Không thể tải dữ liệu doanh thu. Vui lòng kiểm tra API.");
        }
      } finally {
        if (isMounted) {
          setIsTimeLoading(false);
        }
      }
    }

    void loadTimeBreakdown();

    return () => {
      isMounted = false;
    };
  }, [locationState, timeState]);

  useEffect(() => {
    let isMounted = true;

    async function loadYearComparison() {
      try {
        setIsComparisonLoading(true);
        setError(null);
        const response = await getSalesTimeBreakdown(
          "year",
          undefined,
          undefined,
          locationState.stateMemberUniqueName,
          locationState.cityMemberUniqueName,
          locationState.storeMemberUniqueName,
        );

        if (isMounted) {
          setYearComparisonBreakdown(response);
        }
      } catch {
        if (isMounted) {
          setError("Không thể tải dữ liệu doanh thu. Vui lòng kiểm tra API.");
        }
      } finally {
        if (isMounted) {
          setIsComparisonLoading(false);
        }
      }
    }

    void loadYearComparison();

    return () => {
      isMounted = false;
    };
  }, [locationState]);

  useEffect(() => {
    let isMounted = true;

    async function loadLocationBreakdown() {
      try {
        setIsLocationLoading(true);
        setError(null);
        const response = await getSalesStoreBreakdown(
          locationLevel,
          locationState.stateMemberUniqueName,
          locationState.cityMemberUniqueName,
          activeTimeYear,
          activeTimeQuarter,
        );

        if (isMounted) {
          setLocationBreakdown(response);
        }
      } catch {
        if (isMounted) {
          setError("Không thể tải dữ liệu doanh thu. Vui lòng kiểm tra API.");
        }
      } finally {
        if (isMounted) {
          setIsLocationLoading(false);
        }
      }
    }

    void loadLocationBreakdown();

    return () => {
      isMounted = false;
    };
  }, [activeTimeQuarter, activeTimeYear, locationLevel, locationState]);

  const timeTotal = useMemo(
    () => (timeBreakdown?.rows ?? []).reduce((sum, row) => sum + row.revenue, 0),
    [timeBreakdown],
  );
  const timeVolume = useMemo(
    () => (timeBreakdown?.rows ?? []).reduce((sum, row) => sum + row.salesVolume, 0),
    [timeBreakdown],
  );
  const summaryTotal = useMemo(() => summary?.rows.reduce((sum, row) => sum + row.revenue, 0) ?? 0, [summary]);
  const revenueGrowth = useMemo(
    () => getYearChange(yearComparisonBreakdown?.rows ?? [], timeState.year, (row) => row.revenue),
    [timeState.year, yearComparisonBreakdown],
  );
  const timeChartData = (timeBreakdown?.rows ?? []).map((row, index) => ({
    key: getTimeChartKey(row, index),
    label: getTimeDisplayLabel(row, index),
    value: row.revenue,
    formattedValue: formatCurrencyCompact(row.revenue),
    secondaryValue: row.salesVolume,
    formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
    sharePercent: timeTotal > 0 ? (row.revenue / timeTotal) * 100 : undefined,
    sourceIndex: index,
    canDrillDown: row.canDrillDown,
  }));
  const locationRows = useMemo(() => {
    const query = locationLevel === "state" ? "" : locationSearch.trim().toLocaleLowerCase("vi-VN");
    return [...(locationBreakdown?.rows ?? [])]
      .filter((row) => !query || row.label.toLocaleLowerCase("vi-VN").includes(query))
      .sort((left, right) => right.revenue - left.revenue);
  }, [locationBreakdown, locationLevel, locationSearch]);
  const locationTotal = useMemo(() => locationRows.reduce((sum, row) => sum + row.revenue, 0), [locationRows]);
  const locationChartData = useMemo(() => {
    const topRows = locationRows.slice(0, 10).map((row) => ({
      key: row.memberUniqueName,
      label: row.label,
      value: row.revenue,
      formattedValue: formatCurrencyCompact(row.revenue),
      secondaryValue: row.salesVolume,
      formattedSecondaryValue: `${formatNumber(row.salesVolume)} đơn vị`,
      sharePercent: locationTotal > 0 ? (row.revenue / locationTotal) * 100 : undefined,
      canDrillDown: row.canDrillDown || locationLevel === "store",
    }));
    const otherRows = locationRows.slice(10);

    if (!otherRows.length) {
      return topRows;
    }

    const otherRevenue = otherRows.reduce((sum, row) => sum + row.revenue, 0);
    const otherVolume = otherRows.reduce((sum, row) => sum + row.salesVolume, 0);
    return [
      ...topRows,
      {
        key: "__other",
        label: "Khác",
        value: otherRevenue,
        formattedValue: formatCurrencyCompact(otherRevenue),
        secondaryValue: otherVolume,
        formattedSecondaryValue: `${formatNumber(otherVolume)} đơn vị`,
        sharePercent: locationTotal > 0 ? (otherRevenue / locationTotal) * 100 : undefined,
        canDrillDown: false,
      },
    ];
  }, [locationLevel, locationRows, locationTotal]);
  const topLocation = locationRows[0] ?? null;
  const activeRevenue = timeBreakdown ? timeTotal : summaryTotal;

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

  function formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(value)}%`;
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
      const year = timeBreakdown.selectedYear ?? timeState.year;
      return year ? `Quý ${getQuarterNumber(row, index)}/${year}` : `Quý ${getQuarterNumber(row, index)}`;
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

  function drillTime(item: InteractiveTrendDatum) {
    const row = typeof item.sourceIndex === "number" ? timeBreakdown?.rows[item.sourceIndex] : undefined;
    if (!row || !timeBreakdown?.drillTargetLevel || typeof item.sourceIndex !== "number") {
      return;
    }

    if (timeBreakdown.level === "year") {
      setTimeState({ level: "quarter", year: row.key });
      return;
    }

    if (timeBreakdown.level === "quarter" && timeBreakdown.selectedYear) {
      setTimeState({
        level: "month",
        year: timeBreakdown.selectedYear,
        quarter: getQuarterNumber(row, item.sourceIndex),
      });
    }
  }

  function drillLocation(item: InteractiveChartDatum) {
    if (item.key === "__other") {
      return;
    }

    const row = locationBreakdown?.rows.find((candidate) => candidate.memberUniqueName === item.key);
    if (!row) {
      return;
    }

    if (locationLevel === "state") {
      setLocationState({ stateMemberUniqueName: row.memberUniqueName, stateLabel: row.label });
      setLocationSearch("");
      return;
    }

    if (locationLevel === "city") {
      setLocationState({
        stateMemberUniqueName: locationState.stateMemberUniqueName,
        stateLabel: locationState.stateLabel,
        cityMemberUniqueName: row.memberUniqueName,
        cityLabel: row.label,
      });
      setLocationSearch("");
      return;
    }

    setLocationState({
      ...locationState,
      storeMemberUniqueName: row.memberUniqueName,
      storeLabel: row.label,
    });
  }

  function rollTimeUp() {
    if (timeState.level === "month" && timeState.year) {
      setTimeState({ level: "quarter", year: timeState.year });
      return;
    }

    setTimeState({ level: "year" });
  }

  function clearTime() {
    setTimeState({ level: "year" });
  }

  function selectQuickYear(year: string) {
    setTimeState({ level: "quarter", year });
  }

  function rollLocationUp() {
    if (locationState.storeMemberUniqueName) {
      setLocationState({
        stateMemberUniqueName: locationState.stateMemberUniqueName,
        stateLabel: locationState.stateLabel,
        cityMemberUniqueName: locationState.cityMemberUniqueName,
        cityLabel: locationState.cityLabel,
      });
      return;
    }

    if (locationState.cityMemberUniqueName) {
      setLocationState({
        stateMemberUniqueName: locationState.stateMemberUniqueName,
        stateLabel: locationState.stateLabel,
      });
      setLocationSearch("");
      return;
    }

    setLocationState({});
    setLocationSearch("");
  }

  function clearLocation() {
    setLocationState({});
    setLocationSearch("");
  }

  function resetOverview() {
    clearTime();
    clearLocation();
  }

  function timeContextLabel() {
    if (timeState.level === "month" && timeState.year && timeState.quarter) {
      return `${timeState.year} > Quý ${timeState.quarter}`;
    }

    if (timeState.year) {
      return timeState.year;
    }

    return "Toàn kỳ";
  }

  function locationContextLabel() {
    if (locationState.storeLabel) {
      return `${locationState.stateLabel ?? ""} > ${locationState.cityLabel ?? ""} > ${locationState.storeLabel}`;
    }

    if (locationState.cityLabel) {
      return `${locationState.stateLabel ?? ""} > ${locationState.cityLabel}`;
    }

    return locationState.stateLabel ?? "Toàn bộ khu vực";
  }

  function timePanelTitle() {
    if (timeState.level === "month" && timeState.year && timeState.quarter) {
      return `Doanh thu theo tháng - Quý ${timeState.quarter}/${timeState.year}`;
    }

    if (timeState.level === "quarter" && timeState.year) {
      return `Doanh thu theo quý ${timeState.year}`;
    }

    return "Xu hướng doanh thu theo năm";
  }

  function locationPanelTitle() {
    if (locationLevel === "store") {
      return "Doanh thu theo cửa hàng";
    }

    if (locationLevel === "city") {
      return "Doanh thu theo thành phố";
    }

    return "Doanh thu theo khu vực";
  }

  const canRollTime = timeState.level !== "year";
  const canRollLocation = Boolean(
    locationState.stateMemberUniqueName || locationState.cityMemberUniqueName || locationState.storeMemberUniqueName,
  );

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">DOANH THU</p>
          <h2>Phân tích doanh thu theo thời gian và khu vực</h2>
          <p className="muted">Hai biểu đồ phối hợp: thời gian được lọc bởi khu vực, khu vực được lọc bởi thời gian.</p>
        </div>
        <QuickTimeFilter
          years={QUICK_TIME_YEARS}
          activeYear={timeState.year}
          onSelectAll={clearTime}
          onSelectYear={selectQuickYear}
        />
      </header>

      {error ? <p className="compact-error-text">{error}</p> : null}

      <div className="kpi-grid executive-kpi-grid">
        <KpiCard
          label="Doanh thu"
          value={isSummaryLoading || isTimeLoading ? "Đang tải..." : formatCurrencyCompact(activeRevenue)}
          hint={`Thời gian: ${timeContextLabel()}.`}
        />
        <KpiCard
          label="Tăng trưởng doanh thu"
          value={isComparisonLoading ? "Đang tải..." : revenueGrowth ? formatPercent(revenueGrowth.percent) : "--"}
          hint="So với năm trước"
          tone={revenueGrowth ? (revenueGrowth.percent >= 0 ? "positive" : "negative") : "neutral"}
        />
        <KpiCard
          label="Sản lượng bán"
          value={isTimeLoading ? "Đang tải..." : `${formatNumber(timeVolume)} đơn vị`}
          hint={`Khu vực: ${locationContextLabel()}.`}
        />
        <KpiCard
          label="Khu vực dẫn đầu"
          value={topLocation?.label ?? "--"}
          hint={topLocation ? formatCurrencyCompact(topLocation.revenue) : "Đang chờ dữ liệu."}
        />
      </div>

      <div className="analysis-context-bar" aria-label="Ngữ cảnh phân tích">
        <span className="context-chip">
          <strong>Thời gian:</strong> {timeContextLabel()}
          {canRollTime ? (
            <button type="button" onClick={rollTimeUp}>
              Quay lại cấp trước
            </button>
          ) : null}
          {canRollTime ? (
            <button type="button" onClick={clearTime}>
              Bỏ lọc thời gian
            </button>
          ) : null}
        </span>
        <span className="context-chip">
          <strong>Khu vực:</strong> {locationContextLabel()}
          {canRollLocation ? (
            <button type="button" onClick={rollLocationUp}>
              Quay lại cấp trước
            </button>
          ) : null}
          {canRollLocation ? (
            <button type="button" onClick={clearLocation}>
              Bỏ lọc khu vực
            </button>
          ) : null}
        </span>
        <button type="button" className="secondary-button" onClick={resetOverview}>
          Quay lại tổng quan
        </button>
      </div>

      <div className="analysis-chart-grid">
        <SectionCard title={timePanelTitle()} description={`Đang lọc theo khu vực: ${locationContextLabel()}.`}>
          <InteractiveTrendChart
            ariaLabel="Xu hướng doanh thu"
            data={timeChartData}
            loading={isTimeLoading}
            valueLabel="Doanh thu"
            secondaryLabel="Sản lượng bán"
            onPointClick={drillTime}
          />
        </SectionCard>

        <SectionCard title={locationPanelTitle()} description={`Đang lọc theo thời gian: ${timeContextLabel()}.`}>
          {locationLevel !== "state" ? (
            <label className="chart-search">
              <span>Tìm nhanh</span>
              <input
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder={locationLevel === "city" ? "Tìm thành phố" : "Tìm cửa hàng"}
              />
            </label>
          ) : null}
          <p className="muted chart-note">Hiển thị Top 10, phần còn lại gộp vào Khác.</p>
          <InteractiveBarChart
            data={locationChartData}
            loading={isLocationLoading}
            valueLabel="Doanh thu"
            secondaryLabel="Sản lượng bán"
            onDrillDown={drillLocation}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function getLocationLevel(locationState: LocationState): "state" | "city" | "store" {
  if (locationState.cityMemberUniqueName) {
    return "store";
  }

  if (locationState.stateMemberUniqueName) {
    return "city";
  }

  return "state";
}

function getYearChange<T extends { key: string; label: string }>(
  rows: T[],
  selectedYear: string | undefined,
  getValue: (row: T) => number,
): YearChange | null {
  const orderedRows = rows
    .map((row) => {
      const year = extractYear(row.key) ?? extractYear(row.label);
      return year ? { row, year } : null;
    })
    .filter((entry): entry is { row: T; year: string } => entry !== null)
    .sort((left, right) => Number(left.year) - Number(right.year));

  if (orderedRows.length < 2) {
    return null;
  }

  const currentIndex = selectedYear
    ? orderedRows.findIndex((entry) => entry.year === selectedYear)
    : orderedRows.length - 1;

  if (currentIndex <= 0) {
    return null;
  }

  const current = orderedRows[currentIndex];
  const previous = orderedRows[currentIndex - 1];
  const previousValue = getValue(previous.row);

  if (previousValue === 0) {
    return null;
  }

  return {
    percent: ((getValue(current.row) - previousValue) / previousValue) * 100,
    currentYear: current.year,
    previousYear: previous.year,
  };
}

function extractYear(value: string): string | null {
  return value.match(/(?:19|20)\d{2}/)?.[0] ?? null;
}
