
import React, { useState } from 'react';
import { Sparkles, Bot, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FinancialInputs, CalculationResults, AnalysisStatus } from '../types';
import { getFinancialAnalysis } from '../services/aiService';

interface AIAnalysisProps {
  inputs: FinancialInputs;
  results: CalculationResults;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ inputs, results }) => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [analysis, setAnalysis] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAnalyze = async () => {
    if (!results.isValid) return;
    
    setStatus(AnalysisStatus.LOADING);
    setErrorMessage('');
    try {
      const text = await getFinancialAnalysis(inputs, results);
      setAnalysis(text);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || '分析生成失败，请检查网络或配置。');
      setStatus(AnalysisStatus.ERROR);
    }
  };

  if (!results.isValid) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          AI 智能财务诊断 ({inputs.aiConfig.provider === 'google' ? 'Gemini' : '自定义 API'})
        </h2>
      </div>

      {status === AnalysisStatus.IDLE && (
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4 text-sm">点击生成针对细胞制备行业现状的专业诊断报告。</p>
          <button
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Bot className="w-5 h-5" />
            生成智能分析
          </button>
        </div>
      )}

      {status === AnalysisStatus.LOADING && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-800 font-medium text-sm">正在请求模型并处理数据...</p>
        </div>
      )}

      {status === AnalysisStatus.ERROR && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
             <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-red-800 font-medium">请求出错</p>
          <p className="text-red-600 text-xs mt-1 mb-4 max-w-xs mx-auto">{errorMessage}</p>
          <button onClick={handleAnalyze} className="text-indigo-600 hover:text-indigo-800 font-medium underline text-sm">
            重试
          </button>
        </div>
      )}

      {status === AnalysisStatus.SUCCESS && (
        <div className="bg-white/80 backdrop-blur rounded-lg p-6 border border-indigo-100 prose prose-indigo max-w-none text-slate-700">
           <ReactMarkdown>{analysis}</ReactMarkdown>
           <div className="mt-4 pt-4 border-t border-indigo-100 text-right">
             <button onClick={() => setStatus(AnalysisStatus.IDLE)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                重新生成
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
