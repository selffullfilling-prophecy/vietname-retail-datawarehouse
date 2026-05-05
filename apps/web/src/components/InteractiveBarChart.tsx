import { useMemo, useState } from "react";
import { ChartTooltip } from "./ChartTooltip";

export type InteractiveChartDatum = {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  secondaryValue?: number;
  formattedSecondaryValue?: string;
  sharePercent?: number;
  sourceIndex?: number;
  canDrillDown?: boolean;
};

type InteractiveBarChartProps = {
  data: InteractiveChartDatum[];
  valueLabel: string;
  secondaryLabel?: string;
  emptyLabel?: string;
  loading?: boolean;
  onDrillDown?: (item: InteractiveChartDatum) => void;
};

export function InteractiveBarChart({
  data,
  valueLabel,
  secondaryLabel,
  emptyLabel = "Chưa có dữ liệu cho bộ lọc hiện tại.",
  loading = false,
  onDrillDown,
}: InteractiveBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const activeItem = activeIndex === null ? null : data[activeIndex] ?? null;
  const activeSharePercent = activeItem
    ? activeItem.sharePercent ?? (total > 0 ? (activeItem.value / total) * 100 : undefined)
    : undefined;
  const canExploreActive = Boolean(activeItem?.canDrillDown && onDrillDown);

  if (loading) {
    return <p className="muted chart-empty">Đang tải dữ liệu...</p>;
  }

  if (!data.length) {
    return <p className="muted chart-empty">{emptyLabel}</p>;
  }

  return (
    <div className="interactive-chart-shell">
      <div className="interactive-bar-list">
        {data.map((item, index) => {
          const canExplore = Boolean(item.canDrillDown && onDrillDown);
          const width = maxValue > 0 ? Math.max((item.value / maxValue) * 100, 4) : 4;

          return (
            <div
              className="interactive-bar-item"
              key={`${item.key}-${index}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <button
                type="button"
                className={`interactive-bar-row ${canExplore ? "interactive-bar-clickable" : ""}`}
                onBlur={() => setActiveIndex(null)}
                onClick={() => {
                  if (canExplore) {
                    onDrillDown?.(item);
                  }
                }}
                onFocus={() => setActiveIndex(index)}
              >
                <span className="bar-chart-label">
                  <span>{item.label}</span>
                  <strong>{item.formattedValue}</strong>
                </span>
                <span className="bar-track" aria-hidden="true">
                  <span className="bar-fill" style={{ width: `${width}%` }} />
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {activeItem ? (
        <ChartTooltip
          label={activeItem.label}
          primaryLabel={valueLabel}
          primaryValue={activeItem.formattedValue}
          secondaryLabel={secondaryLabel}
          secondaryValue={activeItem.formattedSecondaryValue}
          sharePercent={activeSharePercent}
          hint={canExploreActive ? "Bấm để xem chi tiết" : undefined}
        />
      ) : null}
      {activeItem ? <span className="sr-only">{activeItem.label}</span> : null}
    </div>
  );
}
