'use client';

interface BarChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
}

const BarChart: React.FC<BarChartProps> = ({ title, data, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-zinc-400">{item.label}</span>
              <span className="text-sm font-semibold text-white">{item.value}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${item.color} transition-all duration-300`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarChart;
