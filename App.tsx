
import React, { useState, useMemo } from 'react';
import InputForm from './components/InputForm';
import ResultsDashboard from './components/ResultsDashboard';
import ChartSection from './components/ChartSection';
import AIAnalysis from './components/AIAnalysis';
import ProjectManager from './components/ProjectManager';
import { FinancialInputs, CalculationResults, AIConfig } from './types';
import { DEFAULT_INPUTS } from './constants';
import { Activity, Settings, X, Cpu, Globe, Key, ShieldCheck, Zap, Server, Info } from 'lucide-react';

function App() {
  const [inputs, setInputs] = useState<FinancialInputs>(DEFAULT_INPUTS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleInputChange = (updates: Partial<FinancialInputs>) => {
    setInputs((prev) => ({ ...prev, ...updates }));
  };

  const updateAIConfig = (updates: Partial<AIConfig>) => {
    setInputs(prev => ({
      ...prev,
      aiConfig: { ...prev.aiConfig, ...updates }
    }));
  };

  // Fix: Implemented handleProjectLoad to update global state when a project is loaded
  const handleProjectLoad = (loadedInputs: FinancialInputs) => {
    setInputs(loadedInputs);
  };

  const handleOpenKeyConfig = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      } else {
        alert('当前环境不支持 API 密钥自动选择。');
      }
    } catch (error) {
      console.error('Failed to open key configuration:', error);
    }
  };

  const results: CalculationResults = useMemo(() => {
    const { fc, p, vc, tp, tpMode, tpRate } = inputs;
    
    if (p <= vc) {
      return { cm: 0, cmr: 0, bepUnits: 0, bepAmount: 0, targetUnits: 0, targetAmount: 0, effectiveTp: 0, safetyMargin: 0, isValid: false };
    }

    const cm = p - vc;
    const cmr = cm / p;
    const bepUnits = fc / cm;
    const bepAmount = fc / cmr;

    let targetUnits = 0, targetAmount = 0, effectiveTp = 0;

    if (tpMode === 'rate') {
        const rateDecimal = tpRate / 100;
        if (cmr > rateDecimal) {
            targetAmount = fc / (cmr - rateDecimal);
            targetUnits = targetAmount / p;
            effectiveTp = targetAmount * rateDecimal;
        } else {
            targetAmount = Infinity; targetUnits = Infinity; effectiveTp = Infinity;
        }
    } else {
        targetUnits = (fc + tp) / cm;
        targetAmount = (fc + tp) / cmr;
        effectiveTp = tp;
    }
    
    const safetyMargin = targetAmount > 0 && targetAmount !== Infinity ? (targetAmount - bepAmount) / targetAmount : 0;

    return { cm, cmr, bepUnits, bepAmount, targetUnits, targetAmount, effectiveTp, safetyMargin, isValid: true };
  }, [inputs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">BioFinance Analyzer</h1>
              <p className="text-xs text-slate-500">细胞制备企业财务分析系统</p>
            </div>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-sm active:scale-95"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">API 设置</span>
            <span className="sm:hidden">设置</span>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Settings className="w-5 h-5 text-indigo-600" />
                 AI 智能诊断配置
               </h3>
               <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                 <X className="w-5 h-5 text-slate-500" />
               </button>
            </div>
            
            <div className="p-6 space-y-6">
               {/* Provider Selector */}
               <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button 
                   onClick={() => updateAIConfig({ provider: 'google' })}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${inputs.aiConfig.provider === 'google' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <Globe className="w-4 h-4" /> 国际 (Google Gemini)
                 </button>
                 <button 
                   onClick={() => updateAIConfig({ provider: 'custom' })}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${inputs.aiConfig.provider === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <Server className="w-4 h-4" /> 国内 / 自定义 API
                 </button>
               </div>

               {inputs.aiConfig.provider === 'google' ? (
                 <div className="space-y-6 animate-in slide-in-from-left-2 duration-200">
                    <section>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Google 模型选择</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {['gemini-3-pro-preview', 'gemini-3-flash-preview'].map((m) => (
                          <button 
                            key={m}
                            onClick={() => updateAIConfig({ model: m })}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${inputs.aiConfig.model === m ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
                          >
                            {m.includes('pro') ? <ShieldCheck className="w-5 h-5 mt-0.5 text-indigo-600" /> : <Zap className="w-5 h-5 mt-0.5 text-amber-500" />}
                            <div>
                              <div className="text-sm font-bold text-slate-900">{m.includes('pro') ? 'Advanced Pro (高精度分析)' : 'Turbo Flash (极速响应)'}</div>
                              <div className="text-[10px] text-slate-500">{m}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                    <section>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">API 凭证</h4>
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">请选择已开启 Google Cloud Billing 的付费项目密钥以获得稳定性。</p>
                        <button onClick={handleOpenKeyConfig} className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                          <Key className="w-4 h-4" /> 连接 AI Studio / 选择 Key
                        </button>
                      </div>
                    </section>
                 </div>
               ) : (
                 <div className="space-y-4 animate-in slide-in-from-right-2 duration-200">
                    <section className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">API 基础地址 (Base URL)</label>
                        <input 
                          type="text" 
                          placeholder="https://api.deepseek.com/v1" 
                          value={inputs.aiConfig.customBaseUrl || ''}
                          onChange={(e) => updateAIConfig({ customBaseUrl: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> 例如 DeepSeek, 通义千问, 文心一言等 API 地址</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">API 密钥 (API Key)</label>
                        <input 
                          type="password" 
                          placeholder="sk-xxxxxxxxxxxxxxxx" 
                          value={inputs.aiConfig.customApiKey || ''}
                          onChange={(e) => updateAIConfig({ customApiKey: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">模型标识符 (Model ID)</label>
                        <input 
                          type="text" 
                          placeholder="deepseek-chat" 
                          value={inputs.aiConfig.customModel || ''}
                          onChange={(e) => updateAIConfig({ customModel: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </section>
                 </div>
               )}

               <div className="pt-2">
                 <button 
                   onClick={() => setIsSettingsOpen(false)}
                   className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98]"
                 >
                   保存配置
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ProjectManager currentInputs={inputs} onLoad={handleProjectLoad} />
            <InputForm inputs={inputs} onChange={handleInputChange} />
          </div>
          <div className="lg:col-span-8 min-w-0">
            <ResultsDashboard results={results} inputs={inputs} />
            <ChartSection results={results} inputs={inputs} />
            <AIAnalysis inputs={inputs} results={results} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;