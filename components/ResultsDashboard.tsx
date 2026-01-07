
import React, { useState, useMemo } from 'react';
import { CalculationResults, FinancialInputs } from '../types';
import { Copy, Check, FileText, Table as TableIcon, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ResultsDashboardProps {
  results: CalculationResults;
  inputs: FinancialInputs;
}

const formatCurrency = (val: number) => {
  if (val === Infinity) return '∞';
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(val);
};

const formatPercent = (val: number) => {
  return new Intl.NumberFormat('zh-CN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const formatNumber = (val: number) => {
  if (val === Infinity) return '∞';
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(val);
};

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results, inputs }) => {
  const [copied, setCopied] = useState(false);

  const productChartData = useMemo(() => {
    if (inputs.productMode !== 'detailed' || inputs.productDetails.length === 0) return [];
    return inputs.productDetails.map(item => ({
      name: item.name,
      value: (Number(item.p) || 0) * (Number(item.mix) || 0)
    })).filter(item => item.value > 0);
  }, [inputs.productDetails, inputs.productMode]);

  if (!results.isValid) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center items-center text-slate-400">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p>请输入有效的财务数据以查看分析结果</p>
      </div>
    );
  }

  const isSafe = results.safetyMargin > 0.3;
  const isRisky = results.safetyMargin < 0.1;

  const tpDisplayLabel = inputs.tpMode === 'rate' ? '目标毛利率' : '目标毛利润';
  const tpDisplaySymbol = inputs.tpMode === 'rate' ? 'Gross Rate%' : 'Gross TP';
  const tpDisplayValue = inputs.tpMode === 'rate' ? `${inputs.tpRate}%` : formatCurrency(inputs.tp);

  const markdownTable = `
| 变量/指标 | 符号 | 数值 | 说明 |
| :--- | :---: | ---: | :--- |
| **输入变量** | | | |
| 固定成本 | FC | ${formatCurrency(inputs.fc)} | 年度总固定成本 |
| 产品单价 | P | ${formatCurrency(inputs.p)} | 单个产品销售均价 |
| 单位变动成本 | VC | ${formatCurrency(inputs.vc)} | 单个产品变动成本 |
| ${tpDisplayLabel} | ${tpDisplaySymbol} | ${tpDisplayValue} | 扣除变动与固定成本后 |
| 销售费用 | SalesExp | ${formatCurrency(inputs.salesExpenses)} | 独立的销售支出 |
| **计算结果** | | | |
| 单位贡献毛利 | CM | ${formatCurrency(results.cm)} | P - VC |
| 贡献毛利率 | CMR | ${formatPercent(results.cmr)} | CM / P |
| **盈亏平衡点 (毛利)** | BEP(G) | **${formatNumber(results.bepUnits)}** 单位 | 覆盖 FC |
| **盈亏平衡点 (净利)** | BEP(N) | **${formatNumber(results.bepNetUnits)}** 单位 | 覆盖 FC + SalesExp |
| **目标销售** | Target | **${formatNumber(results.targetUnits)}** 单位 | 满足目标利润的销量 |
| 目标销售额 | Target($) | **${formatCurrency(results.targetAmount)}** | 满足目标利润的销售额 |
| **成本构成分析** | (at Target) | | |
| 预计总变动成本 | Total VC | ${formatCurrency(results.totalVC)} | VC * 目标销量 |
| 业务成本 (FC+VC) | BizCost | ${formatCurrency(results.totalBusinessCost)} | FC + Total VC |
| 总支出 (含销售) | AllCost | ${formatCurrency(results.totalAllCost)} | BizCost + SalesExp |
| **利润预测** | | | |
| 预计毛利润 | Eff.Gross | ${formatCurrency(results.effectiveGrossTp)} | 目标销售额下的毛利 |
| 预计净利润 | Eff.Net | ${formatCurrency(results.effectiveNetTp)} | 目标销售额下的净利 |
| 安全边际率 | SM% | ${formatPercent(results.safetyMargin)} | 风险评估指标 |
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownTable);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <TableIcon className="w-5 h-5 text-indigo-600" />
          二、计算结果 & 输出 (Output)
        </span>
        <button
          onClick={handleCopy}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? '已复制 Markdown' : '复制表格 Markdown'}
        </button>
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-sky-50 border border-sky-100 rounded-xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="relative z-10">
            <p className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">毛利盈亏平衡点 (Gross BEP)</p>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold text-slate-800 tracking-tight">{formatCurrency(results.bepAmount)}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600 font-medium bg-white/50 inline-block px-2 py-0.5 rounded-md">
               {formatNumber(results.bepUnits)} 单位 (仅含FC)
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
             <div className="w-24 h-24 bg-sky-600 rounded-full"></div>
          </div>
        </div>

        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="relative z-10">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">净利盈亏平衡点 (Net BEP)</p>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold text-slate-800 tracking-tight">{formatCurrency(results.bepNetAmount)}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600 font-medium bg-white/50 inline-block px-2 py-0.5 rounded-md">
               {formatNumber(results.bepNetUnits)} 单位 (含销售费用)
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
             <div className="w-24 h-24 bg-indigo-600 rounded-full"></div>
          </div>
        </div>
        
        <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl relative overflow-hidden group hover:shadow-md transition-all">
          <div className="relative z-10">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">目标销售额 (Target)</p>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-bold text-slate-800 tracking-tight">{formatCurrency(results.targetAmount)}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600 font-medium bg-white/50 inline-block px-2 py-0.5 rounded-md">
               {formatNumber(results.targetUnits)} 单位 | 净利: {formatCurrency(results.effectiveNetTp)}
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
             <div className="w-24 h-24 bg-emerald-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Pie Chart for Product Share */}
      {inputs.productMode === 'detailed' && productChartData.length > 0 && (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
           <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
             <PieIcon className="w-4 h-4 text-indigo-500" />
             各产品销售金额的占比饼图 (Sales Revenue Share)
           </h3>
           <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {productChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* Detailed HTML Table */}
      <div className="overflow-hidden border border-slate-200 rounded-lg mb-8">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">变量 / 指标</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">符号</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">数值</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">说明</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {/* Inputs Section */}
            <tr className="bg-slate-50/50">
              <td colSpan={4} className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">输入变量 (Inputs)</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">固定成本</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">FC</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(inputs.fc)}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">年度总固定成本</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">产品单价</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">P</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(inputs.p)}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">单产品销售均价</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">单位变动成本</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">VC</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(inputs.vc)}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">单产品变动成本</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">{tpDisplayLabel}</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">{tpDisplaySymbol}</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{tpDisplayValue}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">扣除变动/固定成本后</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">销售费用</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">SalesExp</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(inputs.salesExpenses)}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">独立的销售支出</td>
            </tr>

            {/* Calculations Section */}
            <tr className="bg-indigo-50/50">
              <td colSpan={4} className="px-6 py-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">计算结果 (Calculations)</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">单位贡献毛利</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">CM</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(results.cm)}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">P - VC</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm font-medium text-slate-700">贡献毛利率</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">CMR</td>
              <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatPercent(results.cmr)}</td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">CM / P</td>
            </tr>
            <tr className="bg-sky-50/30">
              <td className="px-6 py-3 text-sm font-bold text-sky-900">毛利平衡点金额</td>
              <td className="px-6 py-3 text-sm text-center text-sky-500 font-mono font-bold">BEP(G)</td>
              <td className="px-6 py-3 text-sm text-right text-sky-700 font-bold font-mono">{formatCurrency(results.bepAmount)}</td>
              <td className="px-6 py-3 text-sm text-sky-500 hidden sm:table-cell">仅覆盖固定成本</td>
            </tr>
             <tr className="bg-indigo-50/30">
              <td className="px-6 py-3 text-sm font-bold text-indigo-900">净利平衡点金额</td>
              <td className="px-6 py-3 text-sm text-center text-indigo-500 font-mono font-bold">BEP(N)</td>
              <td className="px-6 py-3 text-sm text-right text-indigo-700 font-bold font-mono">{formatCurrency(results.bepNetAmount)}</td>
              <td className="px-6 py-3 text-sm text-indigo-500 hidden sm:table-cell">覆盖FC + 销售费用</td>
            </tr>

            <tr className="bg-emerald-50/30">
              <td className="px-6 py-3 text-sm font-bold text-emerald-900">目标销售额</td>
              <td className="px-6 py-3 text-sm text-center text-emerald-500 font-mono font-bold">Target($)</td>
              <td className="px-6 py-3 text-sm text-right text-emerald-700 font-bold font-mono">{formatCurrency(results.targetAmount)}</td>
              <td className="px-6 py-3 text-sm text-emerald-500 hidden sm:table-cell">
                  满足目标利润
              </td>
            </tr>
            
            {/* Cost Analysis Section */}
            <tr className="bg-slate-100/80">
                <td className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider" colSpan={4}>成本构成分析 (于目标销量下)</td>
            </tr>
            <tr>
                <td className="px-6 py-3 text-sm font-medium text-slate-700 pl-8">预计总变动成本</td>
                <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">Total VC</td>
                <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(results.totalVC)}</td>
                <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">单位VC × 目标销量</td>
            </tr>
            <tr>
                <td className="px-6 py-3 text-sm font-medium text-slate-700 pl-8">预计业务成本 (FC+VC)</td>
                <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">BizCost</td>
                <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono font-bold">{formatCurrency(results.totalBusinessCost)}</td>
                <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">固定成本 + 总变动成本</td>
            </tr>
             <tr>
                <td className="px-6 py-3 text-sm font-medium text-slate-700 pl-8">预计总支出 (含销售)</td>
                <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">AllCost</td>
                <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(results.totalAllCost)}</td>
                <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">业务成本 + 销售费用</td>
            </tr>


            <tr className="bg-emerald-50/10">
                <td className="px-6 py-3 text-sm font-medium text-slate-700">预计毛利润</td>
                <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">Eff.Gross</td>
                <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(results.effectiveGrossTp)}</td>
                <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">Target($) * Rate 或 目标值</td>
            </tr>
            <tr className="bg-emerald-50/10">
                <td className="px-6 py-3 text-sm font-medium text-slate-700">预计净利润</td>
                <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono">Eff.Net</td>
                <td className="px-6 py-3 text-sm text-right text-slate-700 font-mono">{formatCurrency(results.effectiveNetTp)}</td>
                <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">毛利润 - 销售费用</td>
            </tr>
            <tr className={`${isSafe ? 'bg-emerald-100/50' : isRisky ? 'bg-red-100/50' : 'bg-amber-100/50'}`}>
              <td className="px-6 py-3 text-sm font-bold text-slate-800">安全边际率</td>
              <td className="px-6 py-3 text-sm text-center text-slate-500 font-mono font-bold">SM%</td>
              <td className={`px-6 py-3 text-sm text-right font-bold font-mono ${isSafe ? 'text-emerald-700' : isRisky ? 'text-red-700' : 'text-amber-700'}`}>
                {formatPercent(results.safetyMargin)}
              </td>
              <td className="px-6 py-3 text-sm text-slate-500 hidden sm:table-cell">风险评估指标</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Markdown Preview Toggle */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-indigo-600 transition-colors">
          <FileText className="w-4 h-4" />
          <span>查看原始 Markdown 数据</span>
        </summary>
        <div className="mt-3 bg-slate-900 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="text-xs font-mono text-slate-400">output.md</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre">
            {markdownTable}
            </pre>
        </div>
      </details>
    </div>
  );
};

export default ResultsDashboard;
