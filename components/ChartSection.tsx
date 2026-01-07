
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
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || !entries.length) return;
      
      const entry = entries[0];
      const { width, height } = entry.contentRect;

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
  
  // High resolution step
  let step = Math.ceil(maxUnits / 300); 
  if (step < 1) step = 1; 

  const data = [];
  for (let units = 0; units <= maxUnits; units += step) {
    const vc = units * inputs.vc;
    const revenue = units * inputs.p;
    
    // Business Cost = Fixed Cost + Variable Cost
    const businessCost = inputs.fc + vc;
    
    // Total Cost = Business Cost + Sales Expenses
    const totalAllCost = businessCost + inputs.salesExpenses;
    
    data.push({
      units,
      totalRevenue: revenue,
      totalAllCost: totalAllCost,
      businessCost: businessCost,
      fixedCost: inputs.fc, 
    });
  }

  const formatUnits = (val: number) => new Intl.NumberFormat('zh-CN').format(Math.round(val));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // payload[0] is typically Revenue (defined first in LineChart)
      // We need to find specific values by dataKey or name if order changes
      const revenue = payload.find((p: any) => p.dataKey === 'totalRevenue')?.value || 0;
      const totalCost = payload.find((p: any) => p.dataKey === 'totalAllCost')?.value || 0;
      const netProfit = revenue - totalCost;

      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-lg text-sm z-50">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">销量: {new Intl.NumberFormat('zh-CN').format(Math.round(label))} 单位</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex justify-between gap-4 text-xs mb-1">
                <span style={{ color: p.color }}>{p.name}:</span>
                <span className="font-mono font-medium">
                    {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(p.value)}
                </span>
            </div>
          ))}
          {/* Add Net Profit Calculation to Tooltip */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between gap-4 text-xs font-bold">
            <span className="text-slate-600">预估净利润:</span>
            <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                 {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(netProfit)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">盈亏平衡分析图 (Break-Even Chart)</h2>
      
      <div 
        ref={containerRef} 
        className="w-full h-[400px] relative" 
        style={{ width: '100%', height: 400 }}
      >
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
                tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis 
                tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}w`}
                label={{ value: '金额 (CNY)', angle: -90, position: 'insideLeft' }}
                tick={{fill: '#64748b', fontSize: 12}}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Legend verticalAlign="top" height={36}/>
                
                <Line 
                name="总收入 (Revenue)" 
                type="monotone" 
                dataKey="totalRevenue" 
                stroke="#059669" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
                />
                <Line 
                name="总支出 (含销售费用)" 
                type="monotone" 
                dataKey="totalAllCost" 
                stroke="#dc2626" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
                />
                <Line 
                name="业务成本 (FC+VC)" 
                type="monotone" 
                dataKey="businessCost" 
                stroke="#f97316" 
                strokeWidth={2} 
                strokeDasharray="4 2"
                dot={false}
                activeDot={false}
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
                activeDot={false}
                isAnimationActive={false}
                />

                {results.bepUnits > 0 && (
                     <ReferenceDot 
                        x={results.bepUnits} 
                        y={results.bepAmount} 
                        r={5} 
                        fill="#0ea5e9" 
                        stroke="#fff"
                        strokeWidth={2}
                    />
                )}

                {results.bepNetUnits > 0 && (
                    <ReferenceDot 
                        x={results.bepNetUnits} 
                        y={results.bepNetAmount} 
                        r={5} 
                        fill="#4f46e5" 
                        stroke="#fff"
                        strokeWidth={2}
                    />
                )}
                
                {results.targetUnits > 0 && (
                    <ReferenceDot 
                        x={results.targetUnits} 
                        y={results.targetAmount} 
                        r={5} 
                        fill="#d97706" 
                        stroke="#fff"
                        strokeWidth={2}
                    />
                )}

                {results.bepUnits > 0 && (
                    <ReferenceLine 
                        x={results.bepUnits} 
                        stroke="#0ea5e9" 
                        strokeDasharray="3 3" 
                        label={{ 
                            position: 'top',  
                            value: `Gross BEP: ${formatUnits(results.bepUnits)}`, 
                            fill: '#0ea5e9', 
                            fontSize: 10, 
                            dy: -20 
                        }} 
                    />
                )}

                {results.bepNetUnits > 0 && (
                    <ReferenceLine 
                        x={results.bepNetUnits} 
                        stroke="#4f46e5" 
                        strokeDasharray="3 3" 
                        label={{ 
                            position: 'top',  
                            value: `Net BEP: ${formatUnits(results.bepNetUnits)}`, 
                            fill: '#4f46e5', 
                            fontSize: 10 
                        }} 
                    />
                )}

                {results.targetUnits > 0 && (
                    <ReferenceLine 
                        x={results.targetUnits} 
                        stroke="#d97706" 
                        strokeDasharray="3 3" 
                        label={{ 
                            position: 'top',  
                            value: `Target: ${formatUnits(results.targetUnits)}`, 
                            fill: '#d97706', 
                            fontSize: 10,
                            dy: 20
                        }} 
                    />
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
            <span className="w-3 h-3 rounded-full bg-sky-500"></span>
            <span>毛利平衡点</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
            <span>净利平衡点</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600"></span>
            <span>目标点</span>
        </div>
      </div>
    </div>
  );
};

export default ChartSection;
