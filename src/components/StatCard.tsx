interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';
  subtitle?: string;
}

const colorMap = {
  blue: 'stat-card-blue',
  purple: 'stat-card-purple',
  emerald: 'stat-card-emerald',
  amber: 'stat-card-amber',
  rose: 'stat-card-rose',
};

export default function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className={`stat-card ${colorMap[color]}`}>
      <div className="stat-card-content">
        <div className="stat-card-text">
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">{value}</p>
          {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        </div>
        <div className="stat-card-icon">
          {icon}
        </div>
      </div>
    </div>
  );
}
