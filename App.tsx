
import React, { useState, useMemo, useEffect } from 'react';
import InputForm from './components/InputForm';
import ResultsDashboard from './components/ResultsDashboard';
import ChartSection from './components/ChartSection';
import AIAnalysis from './components/AIAnalysis';
import ProjectManager from './components/ProjectManager';
import { FinancialInputs, CalculationResults, AIConfig, SavedAIConfig, SavedProject } from './types';
import { DEFAULT_INPUTS } from './constants';
import { Activity, Settings, X, Globe, Key, ShieldCheck, Zap, Server, Info, Save, Trash2, CheckCircle } from 'lucide-react';

const AI_CONFIG_KEY = 'biofinance_ai_config_v1';
const API_PRESETS_KEY = 'biofinance_api_presets_v1';

// Safe access to window.aistudio for TypeScript
const getAIStudio = () => {
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    return (window as any).aistudio;
  }
  return null;
};

function App() {
  // --- 1. Global State Initialization ---
  const [inputs, setInputs] = useState<FinancialInputs>(() => {
    try {
      const savedConfig = localStorage.getItem(AI_CONFIG_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        // Merge saved config with defaults to ensure new fields (salesExpenses, targetNetProfit) exist
        return {
          ...DEFAULT_INPUTS,
          aiConfig: {
            ...DEFAULT_INPUTS.aiConfig,
            ...parsedConfig
          },
          // Ensure new fields are present if loading from old local storage
          salesExpenses: DEFAULT_INPUTS.salesExpenses,
          targetNetProfit: DEFAULT_INPUTS.targetNetProfit
        };
      }
    } catch (e) {
      console.error("Failed to load AI config", e);
    }
    return DEFAULT_INPUTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [apiPresets, setApiPresets] = useState<SavedAIConfig[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  // Environment Capability Detection
  const [supportsAutoKey, setSupportsAutoKey] = useState(false);

  useEffect(() => {
    const aistudio = getAIStudio();
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      setSupportsAutoKey(true);
    }
    
    // Load presets
    try {
      const savedPresets = localStorage.getItem(API_PRESETS_KEY);
      if (savedPresets) {
        setApiPresets(JSON.parse(savedPresets));
      }
    } catch (e) {
      console.error("Failed to load API presets", e);
    }
  }, []);

  // --- 2. State Management Handlers ---

  const handleInputChange = (updates: Partial<FinancialInputs>) => {
    setInputs((prev) => {
        // Handle sync between Gross Profit (tp) and Net Profit
        // This is a simple sync logic: last edit wins
        let newInputs = { ...prev, ...updates };
        
        // If tp (Gross) or salesExpenses changed, update targetNetProfit
        if (newInputs.tpMode === 'amount') {
            if ('tp' in updates || 'salesExpenses' in updates) {
                newInputs.targetNetProfit = newInputs.tp - newInputs.salesExpenses;
            }
            // If targetNetProfit changed, update tp (Gross)
            else if ('targetNetProfit' in updates) {
                newInputs.tp = newInputs.targetNetProfit + newInputs.salesExpenses;
            }
        }
        
        return newInputs;
    });
  };

  const updateAIConfig = (updates: Partial<AIConfig>) => {
    setInputs(prev => {
      const newConfig = { ...prev.aiConfig, ...updates };
      // Persist active config immediately so it survives refresh
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(newConfig));
      return {
        ...prev,
        aiConfig: newConfig
      };
    });
  };

  const handleProjectLoad = (project: SavedProject) => {
    const loadedInputs = project.inputs;
    setInputs(prev => ({
      ...DEFAULT_INPUTS,
      ...loadedInputs,
      // Ensure backward compatibility for old saves
      salesExpenses: loadedInputs.salesExpenses ?? DEFAULT_INPUTS.salesExpenses,
      targetNetProfit: loadedInputs.targetNetProfit ?? (loadedInputs.tp - (loadedInputs.salesExpenses ?? DEFAULT_INPUTS.salesExpenses)),
      // CRITICAL: Keep the user's current active AI config, ignore the one in the file
      aiConfig: prev.aiConfig 
    }));
    setActiveProjectId(project.id);
  };

  // --- 3. API Preset Logic ---

  const saveCurrentConfigAsPreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: SavedAIConfig = {
      id: Date.now().toString(),
      name: presetName.trim(),
      config: inputs.aiConfig,
      createdAt: Date.now()
    };

    const updatedPresets = [...apiPresets, newPreset];
    setApiPresets(updatedPresets);
    localStorage.setItem(API_PRESETS_KEY, JSON.stringify(updatedPresets));
    setPresetName('');
  };

  const loadPreset = (preset: SavedAIConfig) => {
    updateAIConfig(preset.config);
  };

  const deletePreset = (id: string) => {
    const updatedPresets = apiPresets.filter(p => p.id !== id);
    setApiPresets(updatedPresets);
    localStorage.setItem(API_PRESETS_KEY, JSON.stringify(updatedPresets));
  };

  const handleOpenKeyConfig = async () => {
    try {
      const aistudio = getAIStudio();
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
      } else {
        // Fallback should be handled by UI rendering input instead of button
        alert('当前环境不支持 API 密钥自动选择，请手动输入 Key。');
      }
    } catch (error) {
      console.error('Failed to open key configuration:', error);
    }
  };

  // --- 4. Calculation Logic ---
  const results: CalculationResults = useMemo(() => {
    const { fc, p, vc, tp, tpMode, tpRate, salesExpenses } = inputs;
    
    if (p <= vc) {
      return { 
          cm: 0, cmr: 0, 
          bepUnits: 0, bepAmount: 0, 
          bepNetUnits: 0, bepNetAmount: 0,
          targetUnits: 0, targetAmount: 0, 
          totalVC: 0, totalBusinessCost: 0, totalAllCost: 0,
          effectiveGrossTp: 0, effectiveNetTp: 0, 
          safetyMargin: 0, isValid: false 
      };
    }

    const cm = p - vc;
    const cmr = cm / p;
    
    // Gross Break-Even: Covers Fixed Costs only (Operating BEP)
    const bepUnits = fc / cm;
    const bepAmount = fc / cmr;

    // Net Break-Even: Covers Fixed Costs + Sales Expenses (Net BEP)
    const totalFixedCosts = fc + salesExpenses;
    const bepNetUnits = totalFixedCosts / cm;
    const bepNetAmount = totalFixedCosts / cmr;

    let targetUnits = 0, targetAmount = 0, effectiveGrossTp = 0;

    if (tpMode === 'rate') {
        // tpRate is Gross Margin Rate? Usually Profit Margin. 
        // Let's assume it refers to Gross Profit Margin (Revenue - VC - FC = Revenue * Rate)
        const rateDecimal = tpRate / 100;
        if (cmr > rateDecimal) {
            targetAmount = fc / (cmr - rateDecimal);
            targetUnits = targetAmount / p;
            effectiveGrossTp = targetAmount * rateDecimal;
        } else {
            targetAmount = Infinity; targetUnits = Infinity; effectiveGrossTp = Infinity;
        }
    } else {
        // tp is Target Gross Profit Amount
        targetUnits = (fc + tp) / cm;
        targetAmount = (fc + tp) / cmr;
        effectiveGrossTp = tp;
    }
    
    // Cost Calculations at Target Volume
    const totalVC = targetUnits === Infinity ? Infinity : targetUnits * vc;
    const totalBusinessCost = targetUnits === Infinity ? Infinity : fc + totalVC;
    const totalAllCost = targetUnits === Infinity ? Infinity : totalBusinessCost + salesExpenses;

    const effectiveNetTp = effectiveGrossTp - salesExpenses;
    const safetyMargin = targetAmount > 0 && targetAmount !== Infinity ? (targetAmount - bepAmount) / targetAmount : 0;

    return { 
        cm, cmr, 
        bepUnits, bepAmount, 
        bepNetUnits, bepNetAmount,
        targetUnits, targetAmount, 
        totalVC, totalBusinessCost, totalAllCost,
        effectiveGrossTp, effectiveNetTp, 
        safetyMargin, isValid: true 
    };
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
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Settings className="w-5 h-5 text-indigo-600" />
                 AI 连接配置 (API Settings)
               </h3>
               <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                 <X className="w-5 h-5 text-slate-500" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               
               {/* --- SECTION 1: API Presets --- */}
               <section className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                   <Save className="w-3 h-3" />
                   已保存的配置 (Saved Profiles)
                 </h4>
                 
                 {apiPresets.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {apiPresets.map(preset => {
                          const isActive = JSON.stringify(preset.config) === JSON.stringify(inputs.aiConfig);
                          return (
                            <div key={preset.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isActive ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-slate-800 truncate">{preset.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">
                                            {preset.config.provider === 'google' ? `Google (${preset.config.model})` : `Custom (${preset.config.customModel})`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {!isActive && (
                                        <button 
                                            onClick={() => loadPreset(preset)}
                                            className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200"
                                        >
                                            应用
                                        </button>
                                    )}
                                    {isActive && <span className="text-xs text-indigo-600 font-bold px-2 py-1 bg-indigo-50 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 使用中</span>}
                                    <button 
                                        onClick={() => deletePreset(preset.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                 ) : (
                    <div className="text-center py-4 text-slate-400 text-xs italic">暂无保存的配置预设</div>
                 )}

                 <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-200">
                    <input 
                        type="text" 
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="为当前配置命名 (如: 公司 Gemini Pro)"
                        className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                        onClick={saveCurrentConfigAsPreset}
                        disabled={!presetName.trim()}
                        className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <Save className="w-3 h-3" /> 保存为新预设
                    </button>
                 </div>
               </section>

               {/* --- SECTION 2: Edit Configuration --- */}
               <section>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        当前配置参数 (Current Configuration)
                    </h4>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">修改即时生效 (全局通用)</span>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {['gemini-3-pro-preview', 'gemini-3-flash-preview'].map((m) => (
                            <button 
                                key={m}
                                onClick={() => updateAIConfig({ model: m })}
                                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${inputs.aiConfig.model === m ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
                            >
                                {m.includes('pro') ? <ShieldCheck className="w-5 h-5 mt-0.5 text-indigo-600" /> : <Zap className="w-5 h-5 mt-0.5 text-amber-500" />}
                                <div>
                                <div className="text-sm font-bold text-slate-900">{m.includes('pro') ? 'Gemini Pro' : 'Gemini Flash'}</div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={m}>{m}</div>
                                </div>
                            </button>
                            ))}
                        </div>
                        </section>
                        <section>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">API 凭证</h4>
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            {supportsAutoKey ? (
                                <>
                                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">请选择已开启 Google Cloud Billing 的付费项目密钥以获得稳定性。</p>
                                    <button onClick={handleOpenKeyConfig} className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-600 font-bold text-sm rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                    <Key className="w-4 h-4" /> 连接 AI Studio / 选择 Key
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-2 animate-in fade-in">
                                    <p className="text-xs text-slate-600 mb-1 leading-relaxed flex items-center gap-1">
                                        <Info className="w-3 h-3 text-indigo-500" />
                                        <span>当前环境不支持自动连接，请手动输入 API Key。</span>
                                    </p>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            placeholder="粘贴 Google AI Studio API Key (AIza...)" 
                                            value={inputs.aiConfig.googleApiKey || ''}
                                            onChange={(e) => updateAIConfig({ googleApiKey: e.target.value })}
                                            className="w-full text-sm px-3 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                                        />
                                        <div className="absolute right-3 top-3 text-indigo-400">
                                            <Key className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 pl-1">
                                        访问 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">aistudio.google.com</a> 获取密钥
                                    </p>
                                </div>
                            )}
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
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> 例如 DeepSeek, 通义千问, 文心一言等兼容 OpenAI 格式的地址</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">API 密钥 (API Key)</label>
                            <div className="relative">
                                <input 
                                type="password" 
                                placeholder="sk-xxxxxxxxxxxxxxxx" 
                                value={inputs.aiConfig.customApiKey || ''}
                                onChange={(e) => updateAIConfig({ customApiKey: e.target.value })}
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                                />
                                <div className="absolute right-3 top-2.5 text-slate-400">
                                    <Key className="w-4 h-4" />
                                </div>
                            </div>
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
               </section>

               <div className="pt-4 border-t border-slate-100 flex justify-end">
                 <button 
                   onClick={() => setIsSettingsOpen(false)}
                   className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98]"
                 >
                   完成
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <ProjectManager 
                currentInputs={inputs} 
                onLoad={handleProjectLoad} 
                activeProjectId={activeProjectId}
            />
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
