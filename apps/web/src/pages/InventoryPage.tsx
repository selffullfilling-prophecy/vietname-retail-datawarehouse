import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
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

type PivotOrientation = "rows-time" | "rows-store";
type InventoryTableView = "time" | "store" | "pivot";

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
  const [pivot, setPivot] = useState<InventoryPivotResponse | null>(null);
  const [pivotLoading, setPivotLoading] = useState(true);
  const [pivotError, setPivotError] = useState<string | null>(null);
  const [tableView, setTableView] = useState<InventoryTableView>("time");
  const [pivotOrientation, setPivotOrientation] = useState<PivotOrientation>("rows-time");
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
    storeMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
    storeLabel?: string;
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
  const activeStoreFilter =
    storeDrillState.level === "store" ? storeDrillState.storeMemberUniqueName : undefined;

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

        const message = loadError instanceof Error ? loadError.message : "Không thể tải tổng hợp tồn kho.";
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
          activeStateFilter,
          activeCityFilter,
          activeStoreFilter,
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
  }, [drillState, activeStateFilter, activeCityFilter, activeStoreFilter]);

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

        const response = await getInventoryPivot(
          drillState.level,
          storeDrillState.level,
          drillState.year,
          drillState.quarter,
          storeDrillState.stateMemberUniqueName,
          storeDrillState.cityMemberUniqueName,
          storeDrillState.storeMemberUniqueName,
        );

        if (!isMounted) {
          return;
        }

        setPivot(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Không thể tải pivot tồn kho.";
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

  const totalAverageInventory = useMemo(
    () => summary?.rows.reduce((sum, row) => sum + row.averageInventory, 0) ?? 0,
    [summary],
  );
  const latestYear = summary?.rows.length ? summary.rows[summary.rows.length - 1] : null;
  const peakYear = useMemo(() => {
    if (!summary?.rows.length) {
      return null;
    }

    return [...summary.rows].sort((left, right) => right.averageInventory - left.averageInventory)[0];
  }, [summary]);
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
  const timeSliceOptions = useMemo(() => {
    if (drillState.level === "year") {
      return availableYears.map((year) => ({
        key: year,
        label: year,
      }));
    }

    if (drillState.level === "quarter") {
      return (
        breakdown?.rows.map((row) => ({
          key: row.key,
          label: row.label,
        })) ?? []
      );
    }

    return [];
  }, [availableYears, breakdown, drillState.level]);
  const storeDiceOptions = useMemo(
    () =>
      storeBreakdown?.rows.map((row) => ({
        key: row.memberUniqueName,
        label: row.label,
        memberUniqueName: row.memberUniqueName,
      })) ?? [],
    [storeBreakdown],
  );
  const currentTimeSliceLabel =
    drillState.level === "year"
      ? "Toàn bộ các năm"
      : drillState.level === "quarter"
        ? `Năm ${drillState.year}`
        : `Năm ${drillState.year} / Q${drillState.quarter}`;
  const currentStoreDiceLabel =
    storeDrillState.level === "state"
      ? "Toàn bộ khu vực"
      : storeDrillState.level === "city"
        ? (storeDrillState.stateLabel ?? "Toàn bộ khu vực")
        : `${storeDrillState.stateLabel ?? ""}${storeDrillState.cityLabel ? ` / ${storeDrillState.cityLabel}` : ""}${storeDrillState.storeLabel ? ` / ${storeDrillState.storeLabel}` : ""}`;
  const clearStoreDiceLabel =
    storeDrillState.level === "store"
      ? "Tất cả cửa hàng"
      : storeDrillState.level === "city"
        ? "Tất cả thành phố"
        : "Tất cả vùng";
  const showTimeSliceControls = tableView !== "time" && timeSliceOptions.length > 0;
  const showStoreDiceControls = tableView !== "store" && storeDiceOptions.length > 0;
  const timeContextLabel = useMemo(() => {
    if (drillState.level === "month" && drillState.year && drillState.quarter) {
      return `Năm ${drillState.year} / Q${drillState.quarter}, chi tiết theo tháng`;
    }

    if (drillState.level === "quarter" && drillState.year) {
      return `Năm ${drillState.year}, chi tiết theo quý`;
    }

    return "Toàn bộ các năm";
  }, [drillState]);
  const storeContextLabel = useMemo(() => {
    if (storeDrillState.level === "store" && storeDrillState.stateLabel && storeDrillState.cityLabel) {
      return `${storeDrillState.stateLabel} / ${storeDrillState.cityLabel}${storeDrillState.storeLabel ? ` / ${storeDrillState.storeLabel}` : ""}`;
    }

    if (
      (storeDrillState.level === "city" || storeDrillState.level === "store") &&
      storeDrillState.stateLabel
    ) {
      return storeDrillState.stateLabel;
    }

    return "Toàn bộ khu vực";
  }, [storeDrillState]);
  const activeContextTitle =
    tableView === "time"
      ? "Bảng thời gian vẫn đang giữ nguyên bộ lọc khu vực hiện tại."
      : tableView === "store"
        ? "Bảng khu vực vẫn đang giữ nguyên ngữ cảnh thời gian hiện tại."
        : "Pivot đang kết hợp đồng thời cả thời gian lẫn khu vực.";

  function formatNumber(value: number): string {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
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

  function normalizeQuarterKey(key: string) {
    const quarterMatches = key.match(/\d+/g);
    return quarterMatches?.length ? quarterMatches[quarterMatches.length - 1] : key;
  }

  function handleDrillDown(key: string) {
    if (!breakdown?.drillTargetLevel) {
      return;
    }

    const normalizedQuarterKey = breakdown.level === "quarter" ? normalizeQuarterKey(key) : key;

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

  function handleTimeSliceSelect(key: string) {
    if (drillState.level === "year") {
      setDrillState({
        level: "quarter",
        year: key,
      });
      return;
    }

    if (drillState.level === "quarter" && breakdown?.selectedYear) {
      setDrillState({
        level: "month",
        year: breakdown.selectedYear,
        quarter: normalizeQuarterKey(key),
      });
    }
  }

  function handleClearTimeSlice() {
    setDrillState({ level: "year" });
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

  function handleStoreDiceSelect(memberUniqueName: string, label: string) {
    if (storeDrillState.level === "state") {
      setStoreDrillState({
        level: "city",
        stateMemberUniqueName: memberUniqueName,
        stateLabel: label,
      });
      return;
    }

    if (storeDrillState.level === "city" && storeDrillState.stateMemberUniqueName && storeDrillState.stateLabel) {
      setStoreDrillState({
        level: "store",
        stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
        stateLabel: storeDrillState.stateLabel,
        cityMemberUniqueName: memberUniqueName,
        cityLabel: label,
      });
      return;
    }

    if (
      storeDrillState.level === "store" &&
      storeDrillState.stateMemberUniqueName &&
      storeDrillState.stateLabel &&
      storeDrillState.cityMemberUniqueName &&
      storeDrillState.cityLabel
    ) {
      setStoreDrillState({
        level: "store",
        stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
        stateLabel: storeDrillState.stateLabel,
        cityMemberUniqueName: storeDrillState.cityMemberUniqueName,
        cityLabel: storeDrillState.cityLabel,
        storeMemberUniqueName: memberUniqueName,
        storeLabel: label,
      });
    }
  }

  function handleClearStoreDice() {
    if (
      storeDrillState.level === "store" &&
      storeDrillState.stateMemberUniqueName &&
      storeDrillState.stateLabel &&
      storeDrillState.cityMemberUniqueName &&
      storeDrillState.cityLabel
    ) {
      setStoreDrillState({
        level: "store",
        stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
        stateLabel: storeDrillState.stateLabel,
        cityMemberUniqueName: storeDrillState.cityMemberUniqueName,
        cityLabel: storeDrillState.cityLabel,
      });
      return;
    }

    if (storeDrillState.level === "city" && storeDrillState.stateMemberUniqueName && storeDrillState.stateLabel) {
      setStoreDrillState({
        level: "city",
        stateMemberUniqueName: storeDrillState.stateMemberUniqueName,
        stateLabel: storeDrillState.stateLabel,
      });
      return;
    }

    setStoreDrillState({ level: "state" });
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

  function getPivotValue(timeKey: string, storeKey: string): string {
    const cell = pivotCellMap.get(`${timeKey}::${storeKey}`);
    return cell ? `${formatNumber(cell.averageInventory)} đơn vị` : "--";
  }

  return (
    <div className="page-stack analytics-page compact-screen-page">
      <header className="page-header compact-page-header">
        <div>
          <p className="eyebrow">Phân tích tồn kho</p>
          <h2>Drill down và pivot trong một bảng OLAP</h2>
          <p className="muted">
            Drill thời gian và khu vực vẫn liên thông trong cùng ngữ cảnh, còn pivot chỉ đảm nhiệm việc xoay ma trận để đổi góc nhìn.
          </p>
        </div>
      </header>

      <div className="kpi-grid analytics-kpi-grid compact-kpi-grid">
        <KpiCard
          label="Tổng tồn kho TB"
          value={summaryLoading ? "Đang tải..." : `${formatNumber(totalAverageInventory)} đơn vị`}
          hint="Tổng hợp của các năm."
        />
        <KpiCard
          label="Năm mới nhất"
          value={latestYear?.year ?? "--"}
          hint={latestYear ? `${formatNumber(latestYear.averageInventory)} đơn vị` : "Đang chờ dữ liệu."}
        />
        <KpiCard
          label="Năm cao nhất"
          value={peakYear?.year ?? "--"}
          hint={peakYear ? `${formatNumber(peakYear.averageInventory)} đơn vị` : "Đang chờ dữ liệu."}
        />
      </div>

      <SectionCard
        title="Bảng OLAP tồn kho"
        description="Drill thời gian và khu vực dùng chung ngữ cảnh; pivot chỉ đổi cách trình bày ma trận."
      >
        <div className="olap-card">
          <aside className="olap-toolbar-panel">
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
                  <span className="olap-group-label">Pivot</span>
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

            {showTimeSliceControls || showStoreDiceControls ? (
              <div className="olap-toolbar-row">
                <p className="muted">
                  Slice / dice là bộ lọc nhanh dùng chung ngữ cảnh drill hiện tại, giúp thu hẹp dữ liệu mà không phải dò lại toàn bộ bảng.
                </p>
              </div>
            ) : null}

            {showTimeSliceControls ? (
              <div className="olap-toolbar-row">
                <div className="olap-group">
                  <span className="olap-group-label">Slice thời gian</span>
                  <button
                    type="button"
                    className={`filter-pill ${drillState.level === "year" ? "filter-pill-active" : ""}`}
                    onClick={handleClearTimeSlice}
                  >
                    Tất cả năm
                  </button>
                  {timeSliceOptions.map((option) => {
                    const isActive =
                      drillState.level === "quarter"
                        ? drillState.year === option.key
                        : drillState.level === "month"
                          ? drillState.quarter === normalizeQuarterKey(option.key)
                          : false;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`filter-pill ${isActive ? "filter-pill-active" : ""}`}
                        onClick={() => handleTimeSliceSelect(option.key)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showStoreDiceControls ? (
              <div className="olap-toolbar-row">
                <div className="olap-group">
                  <span className="olap-group-label">Dice khu vực</span>
                  <button
                    type="button"
                    className={`filter-pill ${
                      storeDrillState.level === "state" ||
                      (storeDrillState.level === "city" && !storeDrillState.cityMemberUniqueName) ||
                      (storeDrillState.level === "store" && !storeDrillState.storeMemberUniqueName)
                        ? "filter-pill-active"
                        : ""
                    }`}
                    onClick={handleClearStoreDice}
                  >
                    {clearStoreDiceLabel}
                  </button>
                  {storeDiceOptions.map((option) => {
                    const isActive =
                      storeDrillState.level === "city"
                        ? storeDrillState.stateMemberUniqueName === option.memberUniqueName
                        : storeDrillState.level === "store"
                          ? storeDrillState.storeMemberUniqueName === option.memberUniqueName
                          : false;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`filter-pill ${isActive ? "filter-pill-active" : ""}`}
                        onClick={() => handleStoreDiceSelect(option.memberUniqueName, option.label)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tableView === "pivot" ? (
              <>
                <div className="olap-toolbar-row">
                  <p className="muted">Bộ lọc dưới đây chỉ thu gọn phạm vi hiển thị của ma trận pivot, không thay đổi thao tác pivot.</p>
                </div>

                <div className="olap-toolbar-row">
                  <div className="olap-group">
                    <span className="olap-group-label">Hiển thị trục thời gian</span>
                    <button
                      type="button"
                      className={`filter-pill ${selectedPivotTimeKeys.length === (pivot?.timeAxis.length ?? 0) ? "filter-pill-active" : ""}`}
                      onClick={() => setSelectedPivotTimeKeys(pivot?.timeAxis.map((item) => item.key) ?? [])}
                    >
                      Tất cả mốc
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
                    <span className="olap-group-label">Hiển thị trục khu vực</span>
                    <button
                      type="button"
                      className={`filter-pill ${selectedPivotStoreKeys.length === (pivot?.storeAxis.length ?? 0) ? "filter-pill-active" : ""}`}
                      onClick={() => setSelectedPivotStoreKeys(pivot?.storeAxis.map((item) => item.key) ?? [])}
                    >
                      Tất cả vùng
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
          </aside>

          <div className="olap-data-panel">
            <div className="info-strip olap-info-strip">
            <span className="info-pill">Số năm: {availableYears.length}</span>
            {latestYear ? <span className="info-pill">Gần nhất: {latestYear.year}</span> : null}
            <span className="info-pill">Drill thời gian: {getTimeLevelLabel(drillState.level)}</span>
            <span className="info-pill">Drill khu vực: {getStoreLevelLabel(storeDrillState.level)}</span>
            <span className="info-pill">Slice thời gian: {currentTimeSliceLabel}</span>
            <span className="info-pill">Dice khu vực: {currentStoreDiceLabel}</span>
            <span className="info-pill">Ngữ cảnh thời gian: {timeContextLabel}</span>
            <span className="info-pill">Ngữ cảnh khu vực: {storeContextLabel}</span>
          </div>

          {summaryError ? <p className="compact-error-text">{summaryError}</p> : null}
          {activeTableError ? <p className="compact-error-text">{activeTableError}</p> : null}

          <div className="olap-context-summary">
            <p className="olap-context-title">{activeContextTitle}</p>
            <p className="muted">
              Thời gian: {timeContextLabel}. Khu vực: {storeContextLabel}.
            </p>
          </div>

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
                        <th>Tồn kho TB</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown?.rows.map((row) => (
                        <tr key={`${breakdown.level}-${row.key}`}>
                          <td>{row.label}</td>
                          <td>{formatNumber(row.averageInventory)} đơn vị</td>
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
                        <th>Tồn kho TB</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeBreakdown?.rows.map((row) => (
                        <tr key={`${storeBreakdown.level}-${row.memberUniqueName}`}>
                          <td>{row.label}</td>
                          <td>{formatNumber(row.averageInventory)} đơn vị</td>
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
                                ? getPivotValue(row.key, column.key)
                                : getPivotValue(column.key, row.key)}
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
        </div>
      </SectionCard>
    </div>
  );
}
