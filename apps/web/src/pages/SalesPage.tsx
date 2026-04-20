import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import {
  getSalesPivot,
  getSalesStoreBreakdown,
  getSalesSummaryByYear,
  getSalesTimeBreakdown,
  type SalesPivotResponse,
  type SalesStoreBreakdownResponse,
  type SalesTimeBreakdownResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

type PivotOrientation = "rows-time" | "rows-store";
type SalesMetric = "revenue" | "salesVolume";
type SalesTableView = "time" | "store" | "pivot";

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
  const [pivot, setPivot] = useState<SalesPivotResponse | null>(null);
  const [pivotLoading, setPivotLoading] = useState(true);
  const [pivotError, setPivotError] = useState<string | null>(null);
  const [tableView, setTableView] = useState<SalesTableView>("time");
  const [pivotOrientation, setPivotOrientation] = useState<PivotOrientation>("rows-time");
  const [pivotMetric, setPivotMetric] = useState<SalesMetric>("revenue");
  const [selectedPivotTimeKeys, setSelectedPivotTimeKeys] = useState<string[]>([]);
  const [selectedPivotStoreKeys, setSelectedPivotStoreKeys] = useState<string[]>([]);
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

  const activeTimeYearFilter =
    drillState.level === "quarter" || drillState.level === "month" ? drillState.year : undefined;
  const activeTimeQuarterFilter = drillState.level === "month" ? drillState.quarter : undefined;
  const activeStateFilter =
    storeDrillState.level === "city" || storeDrillState.level === "store"
      ? storeDrillState.stateMemberUniqueName
      : undefined;
  const activeCityFilter =
    storeDrillState.level === "store" ? storeDrillState.cityMemberUniqueName : undefined;

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

        const message = loadError instanceof Error ? loadError.message : "Không thể tải tổng hợp bán hàng.";
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
          activeStateFilter,
          activeCityFilter,
        );

        if (!isMounted) {
          return;
        }

        setBreakdown(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Không thể tải drill-down thời gian.";
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
  }, [drillState, activeStateFilter, activeCityFilter]);

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
          activeTimeYearFilter,
          activeTimeQuarterFilter,
        );

        if (!isMounted) {
          return;
        }

        setStoreBreakdown(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Không thể tải drill-down khu vực.";
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
  }, [storeDrillState, activeTimeYearFilter, activeTimeQuarterFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadPivot() {
      try {
        setPivotLoading(true);
        setPivotError(null);

        const response = await getSalesPivot(
          drillState.level,
          storeDrillState.level,
          drillState.year,
          drillState.quarter,
          storeDrillState.stateMemberUniqueName,
          storeDrillState.cityMemberUniqueName,
        );

        if (!isMounted) {
          return;
        }

        setPivot(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Không thể tải pivot bán hàng.";
        setPivotError(message);
      } finally {
        if (isMounted) {
          setPivotLoading(false);
        }
      }
    }

    void loadPivot();

    return () => {
      isMounted = false;
    };
  }, [drillState, storeDrillState]);

  useEffect(() => {
    const nextKeys = pivot?.timeAxis.map((item) => item.key) ?? [];
    if (!nextKeys.length) {
      setSelectedPivotTimeKeys([]);
      return;
    }

    setSelectedPivotTimeKeys((previous) => {
      if (!previous.length) {
        return nextKeys;
      }

      const filtered = previous.filter((key) => nextKeys.includes(key));
      return filtered.length ? filtered : nextKeys;
    });
  }, [pivot]);

  useEffect(() => {
    const nextKeys = pivot?.storeAxis.map((item) => item.key) ?? [];
    if (!nextKeys.length) {
      setSelectedPivotStoreKeys([]);
      return;
    }

    setSelectedPivotStoreKeys((previous) => {
      if (!previous.length) {
        return nextKeys;
      }

      const filtered = previous.filter((key) => nextKeys.includes(key));
      return filtered.length ? filtered : nextKeys;
    });
  }, [pivot]);

  const totalRevenue = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.revenue, 0) ?? 0,
    [summary],
  );
  const totalSalesVolume = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.salesVolume, 0) ?? 0,
    [summary],
  );
  const latestYear = summary?.rows.length ? summary.rows[summary.rows.length - 1] : null;
  const availableYears = summary?.rows.map((row) => row.year) ?? [];
  const pivotCellMap = useMemo(() => {
    const entries = pivot?.cells.map((cell) => [`${cell.timeKey}::${cell.storeKey}`, cell] as const) ?? [];
    return new Map(entries);
  }, [pivot]);

  const filteredTimeAxis =
    pivot?.timeAxis.filter((item) => selectedPivotTimeKeys.includes(item.key)) ?? [];
  const filteredStoreAxis =
    pivot?.storeAxis.filter((item) => selectedPivotStoreKeys.includes(item.key)) ?? [];
  const pivotRows = pivotOrientation === "rows-time" ? filteredTimeAxis : filteredStoreAxis;
  const pivotColumns = pivotOrientation === "rows-time" ? filteredStoreAxis : filteredTimeAxis;

  const activeTableLoading =
    tableView === "time" ? breakdownLoading : tableView === "store" ? storeBreakdownLoading : pivotLoading;
  const activeTableError =
    tableView === "time" ? breakdownError : tableView === "store" ? storeBreakdownError : pivotError;

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

  function toggleItem(currentItems: string[], nextItem: string, setter: (items: string[]) => void) {
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

    const quarterMatches = key.match(/\d+/g);
    const normalizedQuarterKey =
      breakdown.level === "quarter" && quarterMatches?.length
        ? quarterMatches[quarterMatches.length - 1]
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

  function handleRollUpTime() {
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

  function handleRollUpStore() {
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

  function getTimeLevelLabel(level: "year" | "quarter" | "month"): string {
    if (level === "year") {
      return "Năm";
    }

    if (level === "quarter") {
      return "Quý";
    }

    return "Tháng";
  }

  function getStoreLevelLabel(level: "state" | "city" | "store"): string {
    if (level === "state") {
      return "Khu vực";
    }

    if (level === "city") {
      return "Thành phố";
    }

    return "Cửa hàng";
  }

  function getDrillTargetLabel(level: "quarter" | "month" | "city" | "store" | null): string {
    if (level === "quarter") {
      return "Xem quý";
    }

    if (level === "month") {
      return "Xem tháng";
    }

    if (level === "city") {
      return "Xem thành phố";
    }

    if (level === "store") {
      return "Xem cửa hàng";
    }

    return "";
  }

  function getPivotMetricValue(timeKey: string, storeKey: string): string {
    const cell = pivotCellMap.get(`${timeKey}::${storeKey}`);
    if (!cell) {
      return "--";
    }

    return pivotMetric === "revenue"
      ? formatCurrencyCompact(cell.revenue)
      : `${formatNumber(cell.salesVolume)} đơn vị`;
  }

  return (
    <div className="page-stack analytics-page compact-screen-page">
      <header className="page-header compact-page-header">
        <div>
          <p className="eyebrow">Phân tích bán hàng</p>
          <h2>Drill down, slice/dice và pivot trong một bảng OLAP</h2>
          <p className="muted">
            Hai chiều thời gian và khu vực giờ dùng chung một ngữ cảnh phân tích nên drill và pivot không còn tách rời nhau.
          </p>
        </div>
      </header>

      <div className="kpi-grid analytics-kpi-grid compact-kpi-grid">
        <KpiCard
          label="Tổng doanh thu"
          value={summaryLoading ? "Đang tải..." : formatCurrencyCompact(totalRevenue)}
          hint="Lũy kế toàn bộ năm."
        />
        <KpiCard
          label="Sản lượng bán"
          value={summaryLoading ? "Đang tải..." : `${formatNumber(totalSalesVolume)} đơn vị`}
          hint="Tổng sản lượng hiện có."
        />
        <KpiCard
          label="Năm mới nhất"
          value={latestYear?.year ?? "--"}
          hint={
            latestYear
              ? `${formatCurrencyCompact(latestYear.revenue)} | ${formatNumber(latestYear.salesVolume)} đơn vị`
              : "Đang chờ dữ liệu."
          }
        />
      </div>

      <SectionCard
        title="Bảng OLAP bán hàng"
        description="Cùng một ngữ cảnh lọc được áp dụng cho bảng thời gian, bảng khu vực và ma trận pivot."
      >
        <div className="olap-card">
          <div className="olap-toolbar">
            <div className="olap-toolbar-row">
              <div className="olap-group">
                <span className="olap-group-label">Góc nhìn</span>
                <button
                  type="button"
                  className={`filter-pill ${tableView === "time" ? "filter-pill-active" : ""}`}
                  onClick={() => setTableView("time")}
                >
                  Thời gian
                </button>
                <button
                  type="button"
                  className={`filter-pill ${tableView === "store" ? "filter-pill-active" : ""}`}
                  onClick={() => setTableView("store")}
                >
                  Khu vực
                </button>
                <button
                  type="button"
                  className={`filter-pill ${tableView === "pivot" ? "filter-pill-active" : ""}`}
                  onClick={() => setTableView("pivot")}
                >
                  Pivot
                </button>
              </div>

              {tableView === "pivot" ? (
                <div className="olap-group">
                  <span className="olap-group-label">Chỉ số</span>
                  <button
                    type="button"
                    className={`filter-pill ${pivotMetric === "revenue" ? "filter-pill-active" : ""}`}
                    onClick={() => setPivotMetric("revenue")}
                  >
                    Doanh thu
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${pivotMetric === "salesVolume" ? "filter-pill-active" : ""}`}
                    onClick={() => setPivotMetric("salesVolume")}
                  >
                    Sản lượng
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setPivotOrientation((current) =>
                        current === "rows-time" ? "rows-store" : "rows-time",
                      )}
                  >
                    Đảo hàng / cột
                  </button>
                </div>
              ) : null}
            </div>

            <div className="olap-toolbar-row">
              <div className="olap-group">
                <span className="olap-group-label">Drill thời gian</span>
                <button
                  type="button"
                  className={`breadcrumb-button ${drillState.level === "year" ? "breadcrumb-button-active" : ""}`}
                  onClick={() => setDrillState({ level: "year" })}
                >
                  Năm
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
                {drillState.quarter ? <span className="breadcrumb-chip">Q{drillState.quarter}</span> : null}
              </div>

              {drillState.level !== "year" ? (
                <button type="button" className="secondary-button" onClick={handleRollUpTime}>
                  Roll up thời gian
                </button>
              ) : null}
            </div>

            <div className="olap-toolbar-row">
              <div className="olap-group">
                <span className="olap-group-label">Drill khu vực</span>
                <button
                  type="button"
                  className={`breadcrumb-button ${storeDrillState.level === "state" ? "breadcrumb-button-active" : ""}`}
                  onClick={() => setStoreDrillState({ level: "state" })}
                >
                  Khu vực
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
                {storeDrillState.cityLabel ? <span className="breadcrumb-chip">{storeDrillState.cityLabel}</span> : null}
              </div>

              {storeDrillState.level !== "state" ? (
                <button type="button" className="secondary-button" onClick={handleRollUpStore}>
                  Roll up khu vực
                </button>
              ) : null}
            </div>

            {tableView === "pivot" ? (
              <>
                <div className="olap-toolbar-row">
                  <div className="olap-group">
                    <span className="olap-group-label">Slice theo thời gian</span>
                    <button
                      type="button"
                      className={`filter-pill ${selectedPivotTimeKeys.length === (pivot?.timeAxis.length ?? 0) ? "filter-pill-active" : ""}`}
                      onClick={() => setSelectedPivotTimeKeys(pivot?.timeAxis.map((item) => item.key) ?? [])}
                    >
                      Tất cả
                    </button>
                    {pivot?.timeAxis.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`filter-pill ${selectedPivotTimeKeys.includes(item.key) ? "filter-pill-active" : ""}`}
                        onClick={() => toggleItem(selectedPivotTimeKeys, item.key, setSelectedPivotTimeKeys)}
                      >
                        {item.label}
                      </button>
                    )) ?? null}
                  </div>
                </div>

                <div className="olap-toolbar-row">
                  <div className="olap-group">
                    <span className="olap-group-label">Dice theo khu vực</span>
                    <button
                      type="button"
                      className={`filter-pill ${selectedPivotStoreKeys.length === (pivot?.storeAxis.length ?? 0) ? "filter-pill-active" : ""}`}
                      onClick={() => setSelectedPivotStoreKeys(pivot?.storeAxis.map((item) => item.key) ?? [])}
                    >
                      Tất cả
                    </button>
                    {pivot?.storeAxis.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`filter-pill ${selectedPivotStoreKeys.includes(item.key) ? "filter-pill-active" : ""}`}
                        onClick={() => toggleItem(selectedPivotStoreKeys, item.key, setSelectedPivotStoreKeys)}
                      >
                        {item.label}
                      </button>
                    )) ?? null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="info-strip olap-info-strip">
            <span className="info-pill">Số năm: {availableYears.length}</span>
            {latestYear ? <span className="info-pill">Gần nhất: {latestYear.year}</span> : null}
            <span className="info-pill">Mức thời gian: {getTimeLevelLabel(drillState.level)}</span>
            <span className="info-pill">Mức khu vực: {getStoreLevelLabel(storeDrillState.level)}</span>
            {activeTimeYearFilter ? <span className="info-pill">Lọc năm: {activeTimeYearFilter}</span> : null}
            {activeTimeQuarterFilter ? <span className="info-pill">Lọc quý: Q{activeTimeQuarterFilter}</span> : null}
            {storeDrillState.stateLabel ? <span className="info-pill">Lọc vùng: {storeDrillState.stateLabel}</span> : null}
            {storeDrillState.cityLabel ? <span className="info-pill">Lọc thành phố: {storeDrillState.cityLabel}</span> : null}
          </div>

          {summaryError ? <p className="compact-error-text">{summaryError}</p> : null}
          {activeTableError ? <p className="compact-error-text">{activeTableError}</p> : null}

          {activeTableLoading ? (
            <p className="muted">Đang tải dữ liệu bảng OLAP...</p>
          ) : (
            <div className="data-table-shell olap-table-shell compact-table-shell">
              <table className="data-table compact-data-table">
                {tableView === "time" ? (
                  <>
                    <thead>
                      <tr>
                        <th>{getTimeLevelLabel(breakdown?.level ?? "year")}</th>
                        <th>Doanh thu</th>
                        <th>Sản lượng</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown?.rows.map((row) => (
                        <tr key={`${breakdown.level}-${row.key}`}>
                          <td>{row.label}</td>
                          <td>{formatCurrencyCompact(row.revenue)}</td>
                          <td>{formatNumber(row.salesVolume)} đơn vị</td>
                          <td>
                            {row.canDrillDown && breakdown.drillTargetLevel ? (
                              <button type="button" className="secondary-button" onClick={() => handleDrillDown(row.key)}>
                                {getDrillTargetLabel(breakdown.drillTargetLevel)}
                              </button>
                            ) : (
                              <span className="muted">Mức cuối</span>
                            )}
                          </td>
                        </tr>
                      )) ?? null}
                    </tbody>
                  </>
                ) : null}

                {tableView === "store" ? (
                  <>
                    <thead>
                      <tr>
                        <th>{getStoreLevelLabel(storeBreakdown?.level ?? "state")}</th>
                        <th>Doanh thu</th>
                        <th>Sản lượng</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeBreakdown?.rows.map((row) => (
                        <tr key={`${storeBreakdown.level}-${row.memberUniqueName}`}>
                          <td>{row.label}</td>
                          <td>{formatCurrencyCompact(row.revenue)}</td>
                          <td>{formatNumber(row.salesVolume)} đơn vị</td>
                          <td>
                            {row.canDrillDown && storeBreakdown.drillTargetLevel ? (
                              <button type="button" className="secondary-button" onClick={() => handleStoreDrillDown(row)}>
                                {getDrillTargetLabel(storeBreakdown.drillTargetLevel)}
                              </button>
                            ) : (
                              <span className="muted">Mức cuối</span>
                            )}
                          </td>
                        </tr>
                      )) ?? null}
                    </tbody>
                  </>
                ) : null}

                {tableView === "pivot" ? (
                  <>
                    <thead>
                      <tr>
                        <th>{pivotOrientation === "rows-time" ? getTimeLevelLabel(pivot?.timeLevel ?? "year") : getStoreLevelLabel(pivot?.storeLevel ?? "state")}</th>
                        {pivotColumns.map((item) => (
                          <th key={item.key}>{item.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pivotRows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          {pivotColumns.map((column) => (
                            <td key={`${row.key}-${column.key}`}>
                              {pivotOrientation === "rows-time"
                                ? getPivotMetricValue(row.key, column.key)
                                : getPivotMetricValue(column.key, row.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </>
                ) : null}
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
