import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { SectionCard } from "../components/SectionCard";
import {
  getInventoryStoreBreakdown,
  getInventorySummaryByYear,
  getSalesStoreBreakdown,
  getSalesSummaryByYear,
  type InventoryStoreBreakdownResponse,
  type SalesStoreBreakdownResponse,
  type YearInventorySummaryResponse,
  type YearSalesSummaryResponse,
} from "../services/api";

export function DashboardPage() {
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

        const [salesSummaryResponse, inventorySummaryResponse] = await Promise.all([
          getSalesSummaryByYear(),
          getInventorySummaryByYear(),
        ]);

        if (!isMounted) {
          return;
        }

        setSalesSummary(salesSummaryResponse);
        setInventorySummary(inventorySummaryResponse);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu tổng quan.";
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

    const latestRow = salesSummary.rows[salesSummary.rows.length - 1];
    setSelectedExecutiveYear(latestRow?.year ?? "all");
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

        const message = loadError instanceof Error ? loadError.message : "Không thể tải xếp hạng khu vực.";
        setError(message);
      }
    }

    void loadExecutiveBreakdowns();

    return () => {
      isMounted = false;
    };
  }, [salesSummary, selectedExecutiveYear]);

  const latestSalesYear = salesSummary?.rows.length ? salesSummary.rows[salesSummary.rows.length - 1] : null;
  const previousSalesYear =
    salesSummary && salesSummary.rows.length > 1 ? salesSummary.rows[salesSummary.rows.length - 2] : null;
  const latestInventoryYear =
    inventorySummary?.rows.length ? inventorySummary.rows[inventorySummary.rows.length - 1] : null;
  const executiveYears = salesSummary?.rows.map((row) => row.year) ?? [];
  const totalRevenue = salesSummary?.rows.reduce((sum, row) => sum + row.revenue, 0) ?? 0;
  const totalSalesVolume = salesSummary?.rows.reduce((sum, row) => sum + row.salesVolume, 0) ?? 0;
  const revenueGrowth = useMemo(() => {
    if (!latestSalesYear || !previousSalesYear || previousSalesYear.revenue === 0) {
      return null;
    }

    return ((latestSalesYear.revenue - previousSalesYear.revenue) / previousSalesYear.revenue) * 100;
  }, [latestSalesYear, previousSalesYear]);

  const revenueLeaders = useMemo(
    () => [...(salesStates?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 3),
    [salesStates],
  );

  const inventoryHotspots = useMemo(
    () =>
      [...(inventoryStates?.rows ?? [])]
        .sort((left, right) => right.averageInventory - left.averageInventory)
        .slice(0, 3),
    [inventoryStates],
  );

  const topRevenueState = revenueLeaders[0] ?? null;
  const topInventoryState = inventoryHotspots[0] ?? null;

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

  function formatCurrencyCompact(value: number): string {
    if (value >= 1_000_000_000) {
      return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} tỷ VNĐ`;
    }

    if (value >= 1_000_000) {
      return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1_000_000)} triệu VNĐ`;
    }

    return `${formatNumber(value)} VNĐ`;
  }

  return (
    <div className="page-stack dashboard-page compact-screen-page">
      <header className="page-header compact-page-header">
        <div>
          <p className="eyebrow">Tổng quan điều hành</p>
          <h2>Bức tranh doanh thu và tồn kho trong một màn hình</h2>
          <p className="muted">Rút gọn chỉ số trọng tâm và nhóm dẫn đầu để người dùng xem nhanh mà không phải kéo trang.</p>
        </div>
      </header>

      <div className="kpi-grid compact-kpi-grid dashboard-kpi-grid">
        <KpiCard
          label="Tổng doanh thu"
          value={isLoading ? "Đang tải..." : formatCurrencyCompact(totalRevenue)}
          hint={latestSalesYear ? `Lũy kế đến ${latestSalesYear.year}.` : "Đang chờ dữ liệu."}
        />
        <KpiCard
          label="Sản lượng bán"
          value={isLoading ? "Đang tải..." : `${formatNumber(totalSalesVolume)} đơn vị`}
          hint={latestSalesYear ? `${formatNumber(latestSalesYear.salesVolume)} đơn vị năm ${latestSalesYear.year}.` : "Đang chờ dữ liệu."}
        />
        <KpiCard
          label="Tăng trưởng doanh thu"
          value={isLoading ? "Đang tải..." : revenueGrowth === null ? "--" : formatPercent(revenueGrowth)}
          hint={latestSalesYear && previousSalesYear ? `So với ${previousSalesYear.year}.` : "Cần ít nhất 2 năm dữ liệu."}
        />
        <KpiCard
          label="Tồn kho TB năm mới nhất"
          value={isLoading ? "Đang tải..." : latestInventoryYear ? `${formatNumber(latestInventoryYear.averageInventory)} đơn vị` : "--"}
          hint={latestInventoryYear ? `Ghi nhận tại ${latestInventoryYear.year}.` : "Đang chờ dữ liệu."}
        />
      </div>

      {error ? (
        <section className="status-panel error-panel">
          <strong>Không thể tải dashboard điều hành</strong>
          <p>{error}</p>
        </section>
      ) : null}

      <div className="dashboard-grid compact-dashboard-grid">
        <SectionCard
          title="Điểm nhấn điều hành"
          description="Lọc nhanh theo năm để xem ngay chỉ số nổi bật."
        >
          <div className="dashboard-card-body">
            <div className="drill-toolbar compact-toolbar">
              <div className="breadcrumb-row">
                <button
                  type="button"
                  className={`breadcrumb-button ${selectedExecutiveYear === "all" ? "breadcrumb-button-active" : ""}`}
                  onClick={() => setSelectedExecutiveYear("all")}
                >
                  Toàn kỳ
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

            <div className="detail-grid compact-detail-grid compact-dashboard-details">
              <div>
                <p className="detail-label">Năm xem</p>
                <p className="detail-value">{selectedSalesYear?.year ?? latestSalesYear?.year ?? "--"}</p>
              </div>
              <div>
                <p className="detail-label">Doanh thu</p>
                <p className="detail-value">{selectedSalesYear ? formatCurrencyCompact(selectedSalesYear.revenue) : "--"}</p>
              </div>
              <div>
                <p className="detail-label">Sản lượng</p>
                <p className="detail-value">{selectedSalesYear ? `${formatNumber(selectedSalesYear.salesVolume)} đơn vị` : "--"}</p>
              </div>
              <div>
                <p className="detail-label">Tồn kho TB</p>
                <p className="detail-value">{selectedInventoryYear ? `${formatNumber(selectedInventoryYear.averageInventory)} đơn vị` : "--"}</p>
              </div>
              <div>
                <p className="detail-label">Dẫn đầu doanh thu</p>
                <p className="detail-value">{topRevenueState ? `${topRevenueState.label} | ${formatCurrencyCompact(topRevenueState.revenue)}` : "--"}</p>
              </div>
              <div>
                <p className="detail-label">Tồn kho cao</p>
                <p className="detail-value">{topInventoryState ? `${topInventoryState.label} | ${formatNumber(topInventoryState.averageInventory)} đơn vị` : "--"}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Xu hướng theo năm"
          description="Doanh thu, sản lượng và tồn kho trong cùng một bảng ngắn."
        >
          <div className="data-table-shell compact-table-shell dashboard-table-shell">
            <table className="data-table compact-data-table">
              <thead>
                <tr>
                  <th>Năm</th>
                  <th>Doanh thu</th>
                  <th>Sản lượng</th>
                  <th>Tồn kho TB</th>
                </tr>
              </thead>
              <tbody>
                {salesSummary?.rows.map((salesRow) => {
                  const inventoryRow = inventorySummary?.rows.find((row) => row.year === salesRow.year);

                  return (
                    <tr key={salesRow.year}>
                      <td>{salesRow.year}</td>
                      <td>{formatCurrencyCompact(salesRow.revenue)}</td>
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
          title="Khu vực dẫn đầu"
          description={selectedExecutiveYear === "all" ? "Thu gọn hai cube để xem nhanh top khu vực." : `Top khu vực sau khi lọc năm ${selectedExecutiveYear}.`}
        >
          <div className="mini-cube-grid">
            <article className="mini-cube-card">
              <p className="eyebrow">Retail Analytics Cube</p>
              <h3>Top doanh thu</h3>
              <div className="data-table-shell mini-cube-table-shell">
                <table className="data-table compact-data-table mini-data-table">
                  <thead>
                    <tr>
                      <th>Khu vực</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueLeaders.map((row) => (
                      <tr key={row.memberUniqueName}>
                        <td>{row.label}</td>
                        <td>{formatCurrencyCompact(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="mini-cube-card">
              <p className="eyebrow">Retail Analytics Cube</p>
              <h3>Top tồn kho TB</h3>
              <div className="data-table-shell mini-cube-table-shell">
                <table className="data-table compact-data-table mini-data-table">
                  <thead>
                    <tr>
                      <th>Khu vực</th>
                      <th>Tồn kho TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryHotspots.map((row) => (
                      <tr key={row.memberUniqueName}>
                        <td>{row.label}</td>
                        <td>{formatNumber(row.averageInventory)} đơn vị</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
