type MiniLineChartProps = {
  data: Array<{
    label: string;
    value: number;
  }>;
};

export function MiniLineChart({ data }: MiniLineChartProps) {
  const width = 520;
  const height = 170;
  const padding = 22;
  const values = data.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((item.value - min) / range) * (height - padding * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  if (!data.length) {
    return <p className="muted chart-empty">Chưa có dữ liệu xu hướng.</p>;
  }

  return (
    <svg className="mini-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Xu hướng doanh thu">
      <path d={areaPath} className="line-chart-area" />
      <path d={path} className="line-chart-path" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4" className="line-chart-point" />
          <text x={point.x} y={height - 5} textAnchor="middle" className="line-chart-label">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
