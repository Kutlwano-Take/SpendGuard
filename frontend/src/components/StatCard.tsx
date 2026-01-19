import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
};

const StatCard = ({ title, value, subtitle, icon }: StatCardProps) => {
  return (
    <div className="card stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
