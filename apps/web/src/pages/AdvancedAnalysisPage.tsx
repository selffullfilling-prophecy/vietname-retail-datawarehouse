import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import {
  getInventoryPivot,
  getSalesPivot,
  type InventoryPivotResponse,
  type SalesPivotResponse,
} from "../services/api";

export function AdvancedAnalysisPage() {
  const [salesMatrix, setSalesMatrix] = useState<SalesPivotResponse | null>(null);
  const [inventoryMatrix, setInventoryMatrix] = useState<InventoryPivotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const salesCellMap = useMemo(() => {
    const entries = salesMatrix?.cells.map((cell) => [`${cell.timeKey}::${cell.storeKey}`, cell] as const) ?? [];
    return new Map(entries);
  }, [salesMatrix]);
  const inventoryCellMap = useMemo(() => {
    const entries = inventoryMatrix?.cells.map((cell) => [`${cell.timeKey}::${cell.storeKey}`, cell] as const) ?? [];
    return new Map(entries);
  }, [inventoryMatrix]);

  useEffect(() => {
    let isMounted = true;

    async function loadAdvancedAnalysis() {
      try {
        setIsLoading(true);
        setError(null);
        const [salesResponse, inventoryResponse] = await Promise.all([
          getSalesPivot("year", "state"),
          getInventoryPivot("year", "state"),
        ]);

        if (!isMounted) {
          return;
        }

        setSalesMatrix(salesResponse);
        setInventoryMatrix(inventoryResponse);
      } catch {
        if (isMounted) {
          setError("Không thể tải phân tích nâng cao. Vui lòng kiểm tra API.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAdvancedAnalysis();

    return () => {
      isMounted = false;
    };
  }, []);

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

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">PHÂN TÍCH NÂNG CAO</p>
          <h2>So sánh 2 chiều</h2>
          <p className="muted">Khu riêng cho bảng so sánh chuyên sâu, tách khỏi giao diện điều hành chính.</p>
        </div>
      </header>

      {error ? <p className="compact-error-text">{error}</p> : null}
      {isLoading ? <p className="muted">Đang tải dữ liệu...</p> : null}

      <div className="analysis-chart-grid">
        <SectionCard title="Doanh thu theo năm và khu vực">
          <div className="data-table-shell advanced-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Năm</th>
                  {salesMatrix?.storeAxis.map((column) => <th key={column.key}>{column.label}</th>) ?? null}
                </tr>
              </thead>
              <tbody>
                {salesMatrix?.timeAxis.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    {salesMatrix.storeAxis.map((column) => {
                      const cell = salesCellMap.get(`${row.key}::${column.key}`);
                      return <td key={column.key}>{cell ? formatCurrencyCompact(cell.revenue) : "--"}</td>;
                    })}
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Tồn kho trung bình theo năm và khu vực">
          <div className="data-table-shell advanced-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Năm</th>
                  {inventoryMatrix?.storeAxis.map((column) => <th key={column.key}>{column.label}</th>) ?? null}
                </tr>
              </thead>
              <tbody>
                {inventoryMatrix?.timeAxis.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    {inventoryMatrix.storeAxis.map((column) => {
                      const cell = inventoryCellMap.get(`${row.key}::${column.key}`);
                      return <td key={column.key}>{cell ? `${formatNumber(cell.averageInventory)} đơn vị` : "--"}</td>;
                    })}
                  </tr>
                )) ?? null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
