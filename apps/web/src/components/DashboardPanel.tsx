import type { ReactNode } from "react";

type DashboardPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  size?: "normal" | "large";
};

export function DashboardPanel({ title, description, children, size = "normal" }: DashboardPanelProps) {
  return (
    <section className={`dashboard-panel dashboard-panel-${size}`}>
      <header className="dashboard-panel-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      <div className="dashboard-panel-body">{children}</div>
    </section>
  );
}
