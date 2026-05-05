import { useMemo, useState } from "react";
import { ChartTooltip } from "./ChartTooltip";

export type InteractiveTrendDatum = {
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

type InteractiveTrendChartProps = {
  ariaLabel: string;
  data: InteractiveTrendDatum[];
  valueLabel: string;
  secondaryLabel?: string;
  emptyLabel?: string;
  loading?: boolean;
  onPointClick?: (item: InteractiveTrendDatum) => void;
};

export function InteractiveTrendChart({
  ariaLabel,
  data,
  valueLabel,
  secondaryLabel,
  emptyLabel = "Chưa có dữ liệu cho bộ lọc hiện tại.",
  loading = false,
  onPointClick,
}: InteractiveTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeItem = activeIndex === null ? null : data[activeIndex] ?? null;
  const points = useMemo(() => {
    const width = 520;
    const height = 180;
    const padding = 26;
    const values = data.map((item) => item.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = max - min || 1;

    return data.map((item, index) => {
      const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((item.value - min) / range) * (height - padding * 2);
      return { ...item, x, y };
    });
  }, [data]);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x} 154 L ${points[0].x} 154 Z`
    : "";

  if (loading) {
    return <p className="muted chart-empty">Đang tải dữ liệu...</p>;
  }

  if (!data.length) {
    return <p className="muted chart-empty">{emptyLabel}</p>;
  }

  return (
    <div className="interactive-chart-shell">
      <svg className="mini-line-chart interactive-trend-chart" viewBox="0 0 520 180" role="img" aria-label={ariaLabel}>
        <path d={areaPath} className="line-chart-area" />
        <path d={path} className="line-chart-path" />
        {points.map((point, index) => {
          const canExplore = Boolean(point.canDrillDown && onPointClick);

          return (
            <g
              className={canExplore ? "trend-point-clickable" : undefined}
              key={`${point.key}-${index}`}
              role={canExplore ? "button" : "img"}
              tabIndex={0}
              onBlur={() => setActiveIndex(null)}
              onClick={() => {
                if (canExplore) {
                  onPointClick?.(point);
                }
              }}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (canExplore && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onPointClick?.(point);
                }
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <circle cx={point.x} cy={point.y} r="13" className="line-chart-hit" />
              <circle cx={point.x} cy={point.y} r="5" className="line-chart-point" />
              <text x={point.x} y="172" textAnchor="middle" className="line-chart-label">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      {activeItem ? (
        <ChartTooltip
          label={activeItem.label}
          primaryLabel={valueLabel}
          primaryValue={activeItem.formattedValue}
          secondaryLabel={secondaryLabel}
          secondaryValue={activeItem.formattedSecondaryValue}
          sharePercent={activeItem.sharePercent}
          hint={activeItem.canDrillDown && onPointClick ? "Bấm để xem chi tiết" : undefined}
        />
      ) : null}
    </div>
  );
}
