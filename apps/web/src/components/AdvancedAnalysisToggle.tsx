import type { ReactNode } from "react";
import { useState } from "react";

type AdvancedAnalysisToggleProps = {
  children: ReactNode;
};

export function AdvancedAnalysisToggle({ children }: AdvancedAnalysisToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="advanced-analysis-section">
      <button type="button" className="primary-action-button" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? "Ẩn phân tích nâng cao" : "Mở phân tích nâng cao"}
      </button>
      {isOpen ? <div className="advanced-analysis-body">{children}</div> : null}
    </section>
  );
}
