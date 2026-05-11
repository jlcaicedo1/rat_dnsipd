import { Link } from "react-router-dom";
import type { AppIconName } from "./AppIcon";

export type ExecutiveKpiTone =
  | "neutral"
  | "success"
  | "warning"
  | "orange"
  | "critical";

export type ExecutiveKpiItem = {
  label: string;
  value: string | number;
  context?: string;
  scope?: string;
  icon?: AppIconName;
  tone?: ExecutiveKpiTone;
  emphasize?: boolean;
  to?: string;
};

type ExecutiveKpiGridProps = {
  items: ExecutiveKpiItem[];
  className?: string;
};

export function ExecutiveKpiGrid({
  items,
  className = "",
}: ExecutiveKpiGridProps) {
  return (
    <div className={`summary-grid summary-grid-executive ${className}`.trim()}>
      {items.map((item) => {
        const tone = item.tone ?? "neutral";
        const cardClassName = [
          "executive-kpi-card",
          `executive-kpi-card-${tone}`,
          item.emphasize ? "executive-kpi-card-emphasis" : "",
          item.to ? "executive-kpi-card-link" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const content = (
          <>
            <strong className="executive-kpi-value">{item.value}</strong>
            <span className="executive-kpi-label">{item.label}</span>
            {item.context ? (
              <small className="executive-kpi-context">{item.context}</small>
            ) : null}
            {item.scope ? (
              <small className="executive-kpi-scope">{item.scope}</small>
            ) : null}
          </>
        );

        if (item.to) {
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cardClassName}
              aria-label={`${item.label}: ${item.value}`}
            >
              {content}
            </Link>
          );
        }

        return (
          <article key={item.label} className={cardClassName}>
            {content}
          </article>
        );
      })}
    </div>
  );
}
