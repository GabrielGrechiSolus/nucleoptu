'use client';

interface PieChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
}

const PieChart: React.FC<PieChartProps> = ({ title, data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  let currentAngle = 0;
  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const sliceAngle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
    };
  });

  const radius = 45;
  const centerX = 60;
  const centerY = 60;

  const getPathData = (startAngle: number, endAngle: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="flex flex-col items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-48 h-48">
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={getPathData(slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke="rgb(24, 24, 27)"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <div className="mt-6 space-y-2">
        {slices.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-zinc-400">{item.label}</span>
            </div>
            <span className="text-white font-semibold">{item.value} ({item.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
