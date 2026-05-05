type QuickTimeFilterProps = {
  years: string[];
  activeYear?: string;
  onSelectAll: () => void;
  onSelectYear: (year: string) => void;
};

export function QuickTimeFilter({ years, activeYear, onSelectAll, onSelectYear }: QuickTimeFilterProps) {
  const isAllActive = !activeYear;

  return (
    <div className="quick-time-filter" aria-label="Lọc nhanh theo thời gian">
      <span>Lọc nhanh</span>
      <div className="quick-time-filter-buttons">
        <button
          type="button"
          className={`breadcrumb-button ${isAllActive ? "breadcrumb-button-active" : ""}`}
          aria-pressed={isAllActive}
          onClick={onSelectAll}
        >
          Toàn kỳ
        </button>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={`breadcrumb-button ${activeYear === year ? "breadcrumb-button-active" : ""}`}
            aria-pressed={activeYear === year}
            onClick={() => onSelectYear(year)}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
