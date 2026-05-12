import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import {
  getInventoryAdvancedPivot,
  getSalesAdvancedPivot,
  type InventoryAdvancedPivotResponse,
  type InventoryMeasure,
  type PivotDimension,
  type SalesAdvancedPivotResponse,
  type SalesMeasure,
} from "../services/api";

type SubjectArea = "sales" | "inventory";
type PivotResponse = SalesAdvancedPivotResponse | InventoryAdvancedPivotResponse;

const DIMENSION_LABELS: Record<PivotDimension, string> = {
  time: "Thời gian",
  store: "Khu vực",
  product: "Sản phẩm",
  customer: "Khách hàng",
};

const LEVEL_OPTIONS: Record<PivotDimension, Array<{ value: string; label: string }>> = {
  time: [
    { value: "year", label: "Năm" },
    { value: "quarter", label: "Quý" },
    { value: "month", label: "Tháng" },
  ],
  store: [
    { value: "state", label: "Bang" },
    { value: "city", label: "Thành phố" },
    { value: "store", label: "Cửa hàng" },
  ],
  product: [
    { value: "mamh", label: "Mã hàng" },
    { value: "mota", label: "Mô tả" },
    { value: "kichco", label: "Kích cỡ" },
    { value: "trongluong", label: "Trọng lượng" },
  ],
  customer: [
    { value: "state", label: "Bang" },
    { value: "city", label: "Thành phố" },
    { value: "customer", label: "Mã khách hàng" },
    { value: "name", label: "Tên khách hàng" },
    { value: "travel", label: "Khách du lịch" },
    { value: "postal", label: "Khách bưu điện" },
  ],
};

const SALES_MEASURES: Array<{ value: SalesMeasure; label: string }> = [
  { value: "revenue", label: "Doanh thu" },
  { value: "salesVolume", label: "Sản lượng bán" },
];

const INVENTORY_MEASURES: Array<{ value: InventoryMeasure; label: string }> = [
  { value: "averageInventory", label: "Tồn kho trung bình" },
  { value: "inventoryQuantity", label: "Tồn kho tổng" },
];

export function AdvancedAnalysisPage() {
  const [subject, setSubject] = useState<SubjectArea>("sales");
  const [measure, setMeasure] = useState<SalesMeasure | InventoryMeasure>("revenue");
  const [rowDimension, setRowDimension] = useState<PivotDimension>("time");
  const [columnDimension, setColumnDimension] = useState<PivotDimension>("store");
  const [rowLevel, setRowLevel] = useState("year");
  const [columnLevel, setColumnLevel] = useState("state");
  const [matrix, setMatrix] = useState<PivotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dimensionOptions = subject === "sales"
    ? (["time", "store", "product", "customer"] as PivotDimension[])
    : (["time", "store", "product"] as PivotDimension[]);

  const measureOptions = subject === "sales" ? SALES_MEASURES : INVENTORY_MEASURES;
  const cellMap = useMemo(() => {
    const entries = matrix?.cells.map((cell) => [`${cell.rowKey}::${cell.columnKey}`, cell] as const) ?? [];
    return new Map(entries);
  }, [matrix]);

  useEffect(() => {
    if (subject === "inventory") {
      if (rowDimension === "customer") {
        updateRowDimension("time");
      }
      if (columnDimension === "customer") {
        updateColumnDimension("store");
      }
      if (!INVENTORY_MEASURES.some((option) => option.value === measure)) {
        setMeasure("averageInventory");
      }
      return;
    }

    if (!SALES_MEASURES.some((option) => option.value === measure)) {
      setMeasure("revenue");
    }
  }, [subject]);

  useEffect(() => {
    let isMounted = true;

    async function loadPivot() {
      if (rowDimension === columnDimension) {
        setError("Hàng và cột phải dùng hai dimension khác nhau.");
        setMatrix(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = subject === "sales"
          ? await getSalesAdvancedPivot({
              rowDimension,
              rowLevel,
              columnDimension,
              columnLevel,
              measure: measure as SalesMeasure,
            })
          : await getInventoryAdvancedPivot({
              rowDimension: rowDimension as Exclude<PivotDimension, "customer">,
              rowLevel,
              columnDimension: columnDimension as Exclude<PivotDimension, "customer">,
              columnLevel,
              measure: measure as InventoryMeasure,
            });

        if (isMounted) {
          setMatrix(response);
        }
      } catch {
        if (isMounted) {
          setError("Không thể tải pivot động. Vui lòng kiểm tra API/SSAS.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPivot();

    return () => {
      isMounted = false;
    };
  }, [columnDimension, columnLevel, measure, rowDimension, rowLevel, subject]);

  function updateRowDimension(nextDimension: PivotDimension) {
    setRowDimension(nextDimension);
    setRowLevel(LEVEL_OPTIONS[nextDimension][0].value);
  }

  function updateColumnDimension(nextDimension: PivotDimension) {
    setColumnDimension(nextDimension);
    setColumnLevel(LEVEL_OPTIONS[nextDimension][0].value);
  }

  function swapAxes() {
    const previousRowDimension = rowDimension;
    const previousRowLevel = rowLevel;
    setRowDimension(columnDimension);
    setRowLevel(columnLevel);
    setColumnDimension(previousRowDimension);
    setColumnLevel(previousRowLevel);
  }

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

  function formatCellValue(value: number): string {
    if (subject === "sales" && measure === "revenue") {
      return formatCurrencyCompact(value);
    }

    return `${formatNumber(value)} đơn vị`;
  }

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">PHÂN TÍCH NÂNG CAO</p>
          <h2>Pivot động theo cube</h2>
          <p className="muted">Chọn fact, measure, dimension hàng/cột và cấp phân tích.</p>
        </div>
      </header>

      <div className="pivot-controls" aria-label="Thiết lập pivot">
        <label>
          <span>Fact</span>
          <select value={subject} onChange={(event) => setSubject(event.target.value as SubjectArea)}>
            <option value="sales">Sales</option>
            <option value="inventory">Inventory</option>
          </select>
        </label>
        <label>
          <span>Measure</span>
          <select value={measure} onChange={(event) => setMeasure(event.target.value as SalesMeasure | InventoryMeasure)}>
            {measureOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Hàng</span>
          <select value={rowDimension} onChange={(event) => updateRowDimension(event.target.value as PivotDimension)}>
            {dimensionOptions.map((dimension) => (
              <option key={dimension} value={dimension}>
                {DIMENSION_LABELS[dimension]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cấp hàng</span>
          <select value={rowLevel} onChange={(event) => setRowLevel(event.target.value)}>
            {LEVEL_OPTIONS[rowDimension].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={swapAxes} disabled={rowDimension === columnDimension}>
          Hoán đổi
        </button>
        <label>
          <span>Cột</span>
          <select value={columnDimension} onChange={(event) => updateColumnDimension(event.target.value as PivotDimension)}>
            {dimensionOptions.map((dimension) => (
              <option key={dimension} value={dimension}>
                {DIMENSION_LABELS[dimension]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cấp cột</span>
          <select value={columnLevel} onChange={(event) => setColumnLevel(event.target.value)}>
            {LEVEL_OPTIONS[columnDimension].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="compact-error-text">{error}</p> : null}
      {isLoading ? <p className="muted">Đang tải dữ liệu...</p> : null}

      <SectionCard title={`${matrix?.measureLabel ?? "Measure"}: ${DIMENSION_LABELS[rowDimension]} x ${DIMENSION_LABELS[columnDimension]}`}>
        <div className="data-table-shell advanced-table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>{DIMENSION_LABELS[rowDimension]}</th>
                {matrix?.columnAxis.map((column) => <th key={column.key}>{column.label}</th>) ?? null}
              </tr>
            </thead>
            <tbody>
              {matrix?.rowAxis.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {matrix.columnAxis.map((column) => {
                    const cell = cellMap.get(`${row.key}::${column.key}`);
                    return <td key={column.key}>{cell ? formatCellValue(cell.value) : "--"}</td>;
                  })}
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
