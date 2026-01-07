
import React from 'react';
import { FinancialInputs, FCItem, ProductItem } from '../types';
import { Calculator, DollarSign, Package, TrendingUp, List, Plus, Trash2, PieChart, Percent, ArrowLeftRight, ShoppingBag, PiggyBank } from 'lucide-react';

interface InputFormProps {
  inputs: FinancialInputs;
  onChange: (updates: Partial<FinancialInputs>) => void;
}

const InputForm: React.FC<InputFormProps> = ({ inputs, onChange }) => {

  // --- Handlers for Simple Inputs ---
  const handleSimpleChange = (key: keyof FinancialInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
    onChange({ [key]: isNaN(val) ? 0 : val });
  };

  // --- Handlers for FC Details ---
  const toggleFCMode = () => {
    if (inputs.fcMode === 'simple') {
        const total = inputs.fcDetails.reduce((sum, item) => sum + item.amount, 0);
        onChange({ fcMode: 'detailed', fc: total });
    } else {
        onChange({ fcMode: 'simple' });
    }
  };

  const updateFCItem = (id: string, field: keyof FCItem, value: string | number) => {
    const newDetails = inputs.fcDetails.map(item => 
        item.id === id ? { ...item, [field]: value } : item
    );
    const newTotal = newDetails.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    onChange({ fcDetails: newDetails, fc: newTotal });
  };

  const addFCItem = () => {
    const newItem: FCItem = { id: Date.now().toString(), name: '新费用项', amount: 0 };
    const newDetails = [...inputs.fcDetails, newItem];
    onChange({ fcDetails: newDetails });
  };

  const removeFCItem = (id: string) => {
    const newDetails = inputs.fcDetails.filter(item => item.id !== id);
    const newTotal = newDetails.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    onChange({ fcDetails: newDetails, fc: newTotal });
  };

  // --- Handlers for Product Mix ---
  const toggleProductMode = () => {
    if (inputs.productMode === 'simple') {
        recalculateWeightedAvg(inputs.productDetails);
        onChange({ productMode: 'detailed' });
    } else {
        onChange({ productMode: 'simple' });
    }
  };

  const updateProductItem = (id: string, field: keyof ProductItem, value: string | number) => {
    const newDetails = inputs.productDetails.map(item => 
        item.id === id ? { ...item, [field]: value } : item
    );
    recalculateWeightedAvg(newDetails);
  };

  const addProductItem = () => {
    const newItem: ProductItem = { id: Date.now().toString(), name: '新产品', p: 0, vc: 0, mix: 10 };
    const newDetails = [...inputs.productDetails, newItem];
    recalculateWeightedAvg(newDetails);
  };

  const removeProductItem = (id: string) => {
    const newDetails = inputs.productDetails.filter(item => item.id !== id);
    recalculateWeightedAvg(newDetails);
  };

  const recalculateWeightedAvg = (details: ProductItem[]) => {
    const totalMix = details.reduce((sum, item) => sum + (Number(item.mix) || 0), 0);
    if (totalMix === 0) {
        onChange({ productDetails: details, p: 0, vc: 0 });
        return;
    }

    let weightedP = 0;
    let weightedVC = 0;

    details.forEach(item => {
        const weight = (Number(item.mix) || 0) / totalMix;
        weightedP += (Number(item.p) || 0) * weight;
        weightedVC += (Number(item.vc) || 0) * weight;
    });

    onChange({ 
        productDetails: details, 
        p: parseFloat(weightedP.toFixed(2)), 
        vc: parseFloat(weightedVC.toFixed(2)) 
    });
  };

  // --- Handlers for Target Profit Mode ---
  const toggleTpMode = () => {
    onChange({ tpMode: inputs.tpMode === 'rate' ? 'amount' : 'rate' });
  };

  const totalQuantity = inputs.productDetails.reduce((sum, item) => sum + (Number(item.mix) || 0), 0);
  const totalRevenue = inputs.productDetails.reduce((sum, item) => sum + ((Number(item.p) || 0) * (Number(item.mix) || 0)), 0);
  const totalVC = inputs.productDetails.reduce((sum, item) => sum + ((Number(item.vc) || 0) * (Number(item.mix) || 0)), 0);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-indigo-600" />
        输入变量 (Input Variables)
      </h2>
      
      <div className="space-y-8">
        
        {/* --- 1. Fixed Cost Section --- */}
        <div className="group">
          <div className="flex items-center justify-between mb-2">
             <label className="block text-sm font-medium text-slate-700">
               1. 固定成本 (FC)
             </label>
             <button 
               onClick={toggleFCMode}
               className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${inputs.fcMode === 'detailed' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
               <List className="w-3 h-3" />
               {inputs.fcMode === 'detailed' ? '切换至简易模式' : '启用明细列表'}
             </button>
          </div>

          {inputs.fcMode === 'simple' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold">¥</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={inputs.fc === 0 ? '' : inputs.fc}
                  onChange={handleSimpleChange('fc')}
                  className="block w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="例如：5000000"
                />
              </div>
          ) : (
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                  <div className="min-w-[420px]">
                    <div className="grid grid-cols-[1.5fr_1fr_32px] gap-3 text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1 px-1">
                        <div>费用名称</div>
                        <div className="text-right">金额 (¥)</div>
                        <div></div>
                    </div>
                    {inputs.fcDetails.map((item) => (
                        <div key={item.id} className="grid grid-cols-[1.5fr_1fr_32px] gap-3 items-center mb-1.5">
                            <input 
                               type="text" 
                               value={item.name} 
                               onChange={(e) => updateFCItem(item.id, 'name', e.target.value)}
                               className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                               placeholder="费用名称"
                            />
                            <input 
                               type="number" 
                               value={item.amount || ''}
                               onChange={(e) => updateFCItem(item.id, 'amount', parseFloat(e.target.value))}
                               className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-right bg-white font-mono"
                               placeholder="0"
                            />
                            <button onClick={() => removeFCItem(item.id)} className="text-slate-300 hover:text-red-500 flex justify-center p-1 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 px-1">
                       <button onClick={addFCItem} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-white/50 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> 添加费用项
                       </button>
                       <div className="text-sm font-bold text-slate-700 font-mono">
                          总计: ¥{inputs.fc.toLocaleString()}
                       </div>
                    </div>
                  </div>
              </div>
          )}
        </div>

        {/* --- 2. Product Mix Section (P & VC) --- */}
        <div className="group border-t border-slate-100 pt-6">
           <div className="flex items-center justify-between mb-4">
             <label className="block text-sm font-medium text-slate-700">
               2. 产品售价 (P) & 变动成本 (VC)
             </label>
             <button 
               onClick={toggleProductMode}
               className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${inputs.productMode === 'detailed' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
               <PieChart className="w-3 h-3" />
               {inputs.productMode === 'detailed' ? '切换至简易模式' : '多产品/加权模式'}
             </button>
          </div>

          {inputs.productMode === 'simple' ? (
              <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500">产品单价 (P)</span>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                        type="number"
                        min="0"
                        value={inputs.p === 0 ? '' : inputs.p}
                        onChange={handleSimpleChange('p')}
                        className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="例如：20000"
                        />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-500">单位变动成本 (VC)</span>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Package className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                        type="number"
                        min="0"
                        value={inputs.vc === 0 ? '' : inputs.vc}
                        onChange={handleSimpleChange('vc')}
                        className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="例如：8000"
                        />
                    </div>
                  </div>
              </div>
          ) : (
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <div className="min-w-[550px]">
                    <div className="grid grid-cols-[1fr_100px_100px_80px_70px_30px] gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 px-1">
                        <div>产品名称 (必填)</div>
                        <div className="text-right">单价 (P)</div>
                        <div className="text-right">变动成本 (VC)</div>
                        <div className="text-right">数量/权重</div>
                        <div className="text-right">权重 %</div>
                        <div className="text-center">操作</div>
                    </div>
                    {inputs.productDetails.map((item) => {
                        const weightPct = totalQuantity > 0 ? ((Number(item.mix) || 0) / totalQuantity * 100).toFixed(1) : '0.0';
                        return (
                            <div key={item.id} className="grid grid-cols-[1fr_100px_100px_80px_70px_30px] gap-2 items-center mb-2 animate-in fade-in duration-200">
                                <div className="min-w-0">
                                    <input 
                                        type="text" 
                                        value={item.name} 
                                        onChange={(e) => updateProductItem(item.id, 'name', e.target.value)}
                                        className="w-full text-xs py-1.5 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all font-medium truncate"
                                        placeholder="输入产品名称..."
                                        title={item.name}
                                    />
                                </div>
                                <div>
                                    <input 
                                        type="number" 
                                        value={item.p || ''}
                                        onChange={(e) => updateProductItem(item.id, 'p', parseFloat(e.target.value))}
                                        className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-right bg-white font-mono"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <input 
                                        type="number" 
                                        value={item.vc || ''}
                                        onChange={(e) => updateProductItem(item.id, 'vc', parseFloat(e.target.value))}
                                        className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-right bg-white font-mono"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <input 
                                        type="number" 
                                        value={item.mix || ''}
                                        onChange={(e) => updateProductItem(item.id, 'mix', parseFloat(e.target.value))}
                                        className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 text-right bg-white font-mono"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="text-right text-[10px] font-mono text-slate-600 font-bold bg-slate-100 py-1.5 px-2 rounded border border-slate-200 shadow-inner">
                                    {weightPct}%
                                </div>
                                <div className="flex justify-center">
                                    <button 
                                      onClick={() => removeProductItem(item.id)} 
                                      className="text-slate-300 hover:text-red-500 p-1.5 transition-colors rounded-full hover:bg-red-50"
                                      title="删除此产品"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    
                    <button onClick={addProductItem} className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 font-bold py-1.5 px-3 rounded-lg hover:bg-white shadow-sm transition-all border border-indigo-100/50">
                        <Plus className="w-4 h-4" /> 添加新产品
                    </button>

                    <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-600 space-y-2">
                        <div className="flex justify-between px-1">
                            <span className="flex items-center gap-2 text-slate-500 font-medium">
                                <DollarSign className="w-4 h-4 text-indigo-500 opacity-60" />
                                销售回款小计:
                            </span>
                            <span className="font-bold text-slate-900 font-mono text-sm">¥{totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between px-1">
                            <span className="flex items-center gap-2 text-slate-500 font-medium">
                                <Package className="w-4 h-4 text-emerald-500 opacity-60" />
                                变动成本小计:
                            </span>
                            <span className="font-bold text-slate-900 font-mono text-sm">¥{totalVC.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* --- 3. Target Gross Profit Section --- */}
        <div className="group border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-2">
             <label className="block text-sm font-medium text-slate-700">
               3. 目标毛利润 (Target Gross Profit)
             </label>
             <button 
               onClick={toggleTpMode}
               className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${inputs.tpMode === 'rate' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
               title={inputs.tpMode === 'rate' ? "点击切换为固定金额模式" : "点击切换为利润率模式"}
             >
               <ArrowLeftRight className="w-3 h-3" />
               {inputs.tpMode === 'rate' ? '切换为金额模式 ($)' : '切换为利润率模式 (%)'}
             </button>
          </div>

          <div>
            {inputs.tpMode === 'rate' ? (
                <>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <TrendingUp className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={inputs.tpRate === 0 ? '' : inputs.tpRate}
                            onChange={handleSimpleChange('tpRate')}
                            className="block w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="例如：20"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-slate-500 font-bold">%</span>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">输入期望的毛利率 (Gross Margin)，系统将反推目标销售额。</p>
                </>
            ) : (
                <>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-bold">¥</span>
                        </div>
                        <input
                            type="number"
                            min="0"
                            value={inputs.tp === 0 ? '' : inputs.tp}
                            onChange={handleSimpleChange('tp')}
                            className="block w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="例如：2000000"
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">输入期望实现的年度毛利润（扣除变动成本与固定成本，未扣除销售费用）。</p>
                </>
            )}
          </div>
        </div>
        
        {/* --- 4. Sales Expenses Section --- */}
        <div className="group border-t border-slate-100 pt-6">
           <label className="block text-sm font-medium text-slate-700 mb-2">
             4. 销售费用 (Sales Expenses)
           </label>
           <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                </div>
                <input
                    type="number"
                    min="0"
                    value={inputs.salesExpenses === 0 ? '' : inputs.salesExpenses}
                    onChange={handleSimpleChange('salesExpenses')}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="例如：500000"
                />
            </div>
        </div>

        {/* --- 5. Target Net Profit Section --- */}
        <div className="group border-t border-slate-100 pt-6 pb-2">
           <label className="block text-sm font-medium text-slate-700 mb-2">
             5. 目标净利润 (Target Net Profit)
           </label>
           <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PiggyBank className="w-4 h-4 text-emerald-500" />
                </div>
                <input
                    type="number"
                    min="0"
                    disabled={inputs.tpMode === 'rate'} 
                    value={inputs.targetNetProfit === 0 ? '' : inputs.targetNetProfit}
                    onChange={handleSimpleChange('targetNetProfit')}
                    className="block w-full pl-9 pr-3 py-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-emerald-50/30 disabled:opacity-70 disabled:bg-slate-50 disabled:border-slate-200"
                    placeholder={inputs.tpMode === 'rate' ? "根据毛利率自动计算" : "例如：1500000"}
                />
            </div>
            {inputs.tpMode === 'amount' && (
                <p className="mt-2 text-xs text-slate-500">
                    逻辑关系：净利润 = 毛利润 - 销售费用。修改此处将自动反推毛利润。
                </p>
            )}
        </div>

      </div>
      
      {!inputs.p || !inputs.vc ? null : inputs.p <= inputs.vc && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-pulse">
          <strong>警告：</strong> 加权单价 (P) 必须大于单位变动成本 (VC)，否则无法计算盈亏平衡点。
        </div>
      )}
    </div>
  );
};

export default InputForm;
