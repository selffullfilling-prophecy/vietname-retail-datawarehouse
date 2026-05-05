type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type BreadcrumbTrailProps = {
  items: BreadcrumbItem[];
  backLabel?: string;
  onBack?: () => void;
};

export function BreadcrumbTrail({ items, backLabel = "Quay lại", onBack }: BreadcrumbTrailProps) {
  return (
    <div className="breadcrumb-trail" aria-label="Đường dẫn phân tích">
      {onBack ? (
        <button type="button" className="secondary-button" onClick={onBack}>
          {backLabel}
        </button>
      ) : null}
      <div className="breadcrumb-items">
        {items.map((item, index) => (
          <span className="breadcrumb-segment" key={`${item.label}-${index}`}>
            {index > 0 ? <span className="breadcrumb-separator">/</span> : null}
            {item.onClick ? (
              <button type="button" className="breadcrumb-link" onClick={item.onClick}>
                {item.label}
              </button>
            ) : (
              <span>{item.label}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
