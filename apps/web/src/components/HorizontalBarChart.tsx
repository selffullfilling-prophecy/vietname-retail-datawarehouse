export type ChartDatum = {
  label: string;
  value: number;
  formattedValue: string;
};

type HorizontalBarChartProps = {
  data: ChartDatum[];
  emptyLabel?: string;
};

export function HorizontalBarChart({ data, emptyLabel = "Chưa có dữ liệu." }: HorizontalBarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  if (!data.length) {
    return <p className="muted chart-empty">{emptyLabel}</p>;
  }

  return (
    <div className="bar-chart-list">
      {data.map((item) => {
        const width = maxValue > 0 ? Math.max((item.value / maxValue) * 100, 4) : 4;

        return (
          <div className="bar-chart-row" key={item.label}>
            <div className="bar-chart-label">
              <span>{item.label}</span>
              <strong>{item.formattedValue}</strong>
            </div>
            <div className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
