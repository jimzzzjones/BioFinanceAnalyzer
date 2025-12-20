import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceLine
} from 'recharts';
import { CalculationResults, FinancialInputs } from '../types';

interface ChartSectionProps {
  results: CalculationResults;
  inputs: FinancialInputs;
}

const ChartSection: React.FC<ChartSectionProps> = ({ results, inputs }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Use ResizeObserver to manually track container dimensions.
  // This completely bypasses Recharts' ResponsiveContainer logic which can be flaky
  // during rapid state updates or layout shifts.
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || !entries.length) return;
      
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      // Only update state if dimensions are valid and have changed significantly
      // to avoid unnecessary re-renders or loops.
      if (width > 0 && height > 0) {
        setDimensions(prev => {
          if (Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2) {
            return prev;
          }
          return { width, height };
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  if (!results.isValid || results.targetUnits === Infinity) return null;

  // Generate data points for the chart
  // Range: 0 to 120% of Target Sales Volume
  let maxUnits = Math.ceil(results.targetUnits * 1.2);
  if (maxUnits === 0) maxUnits = 10; 
  
  let step = Math.ceil(maxUnits / 10);
  if (step === 0) step = 1; 

  const data = [];
  for (let units = 0; units <= maxUnits; units += step) {
    data.push({
      units,
      totalRevenue: units * inputs.p,
      totalCost: inputs.fc + (units * inputs.vc),
      fixedCost: inputs.fc,
    });
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-slate-800 mb-1">销量: {Math.round(label)} 单位</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">盈亏平衡分析图 (Break-Even Chart)</h2>
      
      {/* 
         Container holding the ref for ResizeObserver.
         We set an explicit style height to ensure it takes up space.
      */}
      <div 
        ref={containerRef} 
        className="w-full h-[400px] relative" 
        style={{ width: '100%', height: 400 }}
      >
        {/* Only render LineChart if we have valid detected dimensions */}
        {dimensions.width > 0 && dimensions.height > 0 ? (
            <LineChart
                width={dimensions.width}
                height={dimensions.height}
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                dataKey="units" 
                type="number"
                domain={[0, 'auto']}
                label={{ value: '销售数量 (单位)', position: 'insideBottomRight', offset: -10 }} 
                tick={{fill: '#64748b'}}
                />
                <YAxis 
                tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}w`}
                label={{ value: '金额 (CNY)', angle: -90, position: 'insideLeft' }}
                tick={{fill: '#64748b'}}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36}/>
                
                <Line 
                name="总收入 (Revenue)" 
                type="monotone" 
                dataKey="totalRevenue" 
                stroke="#059669" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
                />
                <Line 
                name="总成本 (Total Cost)" 
                type="monotone" 
                dataKey="totalCost" 
                stroke="#dc2626" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
                />
                <Line 
                name="固定成本 (FC)" 
                type="monotone" 
                dataKey="fixedCost" 
                stroke="#94a3b8" 
                strokeDasharray="5 5" 
                strokeWidth={1} 
                dot={false}
                isAnimationActive={false}
                />

                {results.bepUnits > 0 && (
                    <ReferenceDot 
                        x={results.bepUnits} 
                        y={results.bepAmount} 
                        r={6} 
                        fill="#4f46e5" 
                        stroke="#fff"
                        strokeWidth={2}
                    />
                )}
                
                {results.targetUnits > 0 && (
                    <ReferenceDot 
                        x={results.targetUnits} 
                        y={results.targetAmount} 
                        r={6} 
                        fill="#d97706" 
                        stroke="#fff"
                        strokeWidth={2}
                    />
                )}

                {results.bepUnits > 0 && (
                    <ReferenceLine x={results.bepUnits} stroke="#4f46e5" strokeDasharray="3 3" label={{ position: 'top',  value: 'BEP', fill: '#4f46e5', fontSize: 12 }} />
                )}
            </LineChart>
        ) : (
             <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded text-slate-400 text-sm">
                加载图表...
            </div>
        )}
      </div>
      <div className="mt-4 flex gap-6 justify-center text-sm text-slate-600">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
            <span>盈亏平衡点</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600"></span>
            <span>目标利润点</span>
        </div>
      </div>
    </div>
  );
};

export default ChartSection;