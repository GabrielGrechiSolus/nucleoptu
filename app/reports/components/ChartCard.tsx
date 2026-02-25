'use client';

interface ChartCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const colorClasses = {
  blue: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
  green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  red: 'bg-red-500/10 border-red-500/30 text-red-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
};

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color,
}) => {
  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 md:p-6`}>
      <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
      <p className="text-3xl font-bold text-white mb-2">{value}</p>
      {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      {trend !== undefined && (
        <div className={`text-xs mt-2 ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
};

export default ChartCard;
