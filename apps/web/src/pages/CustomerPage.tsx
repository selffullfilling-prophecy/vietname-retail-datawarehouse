import { useEffect, useMemo, useState } from "react";
import { ExecutiveKpiCard } from "../components/ExecutiveKpiCard";
import { HorizontalBarChart } from "../components/HorizontalBarChart";
import { SectionCard } from "../components/SectionCard";
import {
  getSalesCustomerBreakdown,
  type SalesCustomerBreakdownResponse,
} from "../services/api";

export function CustomerPage() {
  const [breakdown, setBreakdown] = useState<SalesCustomerBreakdownResponse | null>(null);
  const [customerState, setCustomerState] = useState<{
    level: "state" | "city" | "customer";
    stateMemberUniqueName?: string;
    cityMemberUniqueName?: string;
    stateLabel?: string;
    cityLabel?: string;
  }>({ level: "state" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomers() {
      try {
        setError(null);
        const response = await getSalesCustomerBreakdown(
          customerState.level,
          customerState.stateMemberUniqueName,
          customerState.cityMemberUniqueName,
        );

        if (isMounted) {
          setBreakdown(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu khách hàng.");
        }
      }
    }

    void loadCustomers();

    return () => {
      isMounted = false;
    };
  }, [customerState]);

  const topRows = useMemo(
    () => [...(breakdown?.rows ?? [])].sort((left, right) => right.revenue - left.revenue).slice(0, 8),
    [breakdown],
  );
  const totalRevenue = useMemo(() => (breakdown?.rows ?? []).reduce((sum, row) => sum + row.revenue, 0), [breakdown]);
  const totalVolume = useMemo(() => (breakdown?.rows ?? []).reduce((sum, row) => sum + row.salesVolume, 0), [breakdown]);
  const leader = topRows[0] ?? null;

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

  function drillCustomer(row: SalesCustomerBreakdownResponse["rows"][number]) {
    if (!breakdown?.drillTargetLevel) {
      return;
    }

    if (breakdown.level === "state") {
      setCustomerState({ level: "city", stateMemberUniqueName: row.memberUniqueName, stateLabel: row.label });
      return;
    }

    if (breakdown.level === "city") {
      setCustomerState({
        level: "customer",
        stateMemberUniqueName: customerState.stateMemberUniqueName,
        stateLabel: customerState.stateLabel,
        cityMemberUniqueName: row.memberUniqueName,
        cityLabel: row.label,
      });
    }
  }

  function rollUp() {
    if (customerState.level === "customer") {
      setCustomerState({ level: "city", stateMemberUniqueName: customerState.stateMemberUniqueName, stateLabel: customerState.stateLabel });
      return;
    }

    setCustomerState({ level: "state" });
  }

  function levelLabel() {
    if (customerState.level === "city") {
      return "Thành phố khách hàng";
    }

    if (customerState.level === "customer") {
      return "Khách hàng";
    }

    return "Vùng / Bang";
  }

  return (
    <div className="page-stack executive-page">
      <header className="page-header executive-header">
        <div>
          <p className="eyebrow">Khách hàng</p>
          <h2>Khách hàng theo vùng, thành phố và từng khách hàng</h2>
          <p className="muted">Tập trung vào nhóm đang đóng góp doanh thu lớn nhất.</p>
        </div>
      </header>

      {error ? <p className="compact-error-text">{error}</p> : null}

      <div className="executive-kpi-grid three-up">
        <ExecutiveKpiCard label="Doanh thu từ nhóm đang xem" value={formatCurrencyCompact(totalRevenue)} />
        <ExecutiveKpiCard label="Sản lượng bán" value={`${formatNumber(totalVolume)} đơn vị`} />
        <ExecutiveKpiCard label="Dẫn đầu" value={leader?.label ?? "--"} hint={leader ? formatCurrencyCompact(leader.revenue) : "Chưa có dữ liệu."} />
      </div>

      <SectionCard title={levelLabel()}>
        <div className="section-action-row">
          {customerState.level !== "state" ? (
            <button type="button" className="secondary-button" onClick={rollUp}>
              Quay lại tổng quan
            </button>
          ) : null}
          <span className="muted">Bấm “Xem chi tiết” để đi từ vùng đến thành phố và khách hàng.</span>
        </div>
        <HorizontalBarChart
          data={topRows.map((row) => ({
            label: row.label,
            value: row.revenue,
            formattedValue: formatCurrencyCompact(row.revenue),
          }))}
        />
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
              {breakdown?.rows.map((row) => (
                <tr key={row.memberUniqueName}>
                  <td>{row.label}</td>
                  <td>{formatCurrencyCompact(row.revenue)}</td>
                  <td>{formatNumber(row.salesVolume)} đơn vị</td>
                  <td>
                    {row.canDrillDown ? (
                      <button type="button" className="secondary-button" onClick={() => drillCustomer(row)}>
                        Xem chi tiết
                      </button>
                    ) : null}
                  </td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
