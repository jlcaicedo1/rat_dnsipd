import { Link } from "react-router-dom";
import { AppIcon, type AppIconName } from "./AppIcon";

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
            <div className="executive-kpi-kv">
              {item.icon && (
                <span className="executive-kpi-icon" aria-hidden="true">
                  <AppIcon name={item.icon} size={15} strokeWidth={2} />
                </span>
              )}
              <strong className="executive-kpi-value">{item.value}</strong>
            </div>
            <span className="executive-kpi-label">{item.label}</span>
            {item.context && (
              <small className="executive-kpi-context">{item.context}</small>
            )}
            {item.scope && (
              <small className="executive-kpi-scope">{item.scope}</small>
            )}
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
