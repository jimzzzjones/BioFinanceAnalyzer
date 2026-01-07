
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bot, AlertCircle, Send, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FinancialInputs, CalculationResults, AnalysisStatus } from '../types';
import { getFinancialAnalysis } from '../services/aiService';

interface AIAnalysisProps {
  inputs: FinancialInputs;
  results: CalculationResults;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ inputs, results }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [inputQuery, setInputQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleInitialAnalysis = async () => {
    if (!results.isValid) return;
    
    setStatus(AnalysisStatus.LOADING);
    
    // Add initial user message implicitly (visual only or actually add it?)
    // Let's just generate the report as the first AI message.
    
    try {
      const text = await getFinancialAnalysis(inputs, results);
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: text,
        timestamp: Date.now()
      }]);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || '分析生成失败，请检查网络或配置。';
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ ${errorMsg}`,
        timestamp: Date.now()
      }]);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleSendMessage = async () => {
    if (!inputQuery.trim() || !results.isValid || status === AnalysisStatus.LOADING) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputQuery,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setStatus(AnalysisStatus.LOADING);

    try {
      const text = await getFinancialAnalysis(inputs, results, userMsg.content);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error: any) {
       const errorMsg = error.message || '请求失败';
       const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 请求出错: ${errorMsg}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!results.isValid) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm border border-indigo-100 mt-6 flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          AI 智能财务顾问 ({inputs.aiConfig.provider === 'google' ? 'Gemini' : '自定义 API'})
        </h2>
        {messages.length > 0 && (
            <button 
                onClick={() => setMessages([])} 
                className="text-xs text-slate-500 hover:text-indigo-600 underline"
            >
                清空对话
            </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto bg-white/60 backdrop-blur rounded-lg border border-indigo-100 p-4 mb-4 scrollbar-thin scrollbar-thumb-indigo-200">
        {messages.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="bg-indigo-100 p-4 rounded-full mb-4">
                 <Bot className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-indigo-900 mb-2">我是您的专属 AI 财务顾问</h3>
              <p className="text-slate-600 text-sm max-w-md mb-6">
                我可以根据您当前的财务模型数据，生成专业的诊断报告，或回答您关于成本、定价、风险等方面的具体问题。
              </p>
              <button
                onClick={handleInitialAnalysis}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm animate-in fade-in zoom-in"
              >
                <Sparkles className="w-4 h-4" />
                生成全面诊断报告
              </button>
           </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                }`}>
                  {msg.role === 'assistant' ? (
                     <div className="prose prose-sm prose-indigo max-w-none">
                       <ReactMarkdown>{msg.content}</ReactMarkdown>
                     </div>
                  ) : (
                     <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                )}
              </div>
            ))}
            
            {status === AnalysisStatus.LOADING && (
                <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 relative">
        <textarea
           value={inputQuery}
           onChange={(e) => setInputQuery(e.target.value)}
           onKeyDown={handleKeyDown}
           placeholder={messages.length === 0 ? "您可以直接提问，例如：'如果固定成本增加 10%，盈亏平衡点会怎么变？'" : "请输入您的问题..."}
           className="w-full pl-4 pr-12 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm resize-none text-sm min-h-[50px] max-h-[120px]"
           rows={1}
           disabled={status === AnalysisStatus.LOADING}
        />
        <button 
           onClick={handleSendMessage}
           disabled={!inputQuery.trim() || status === AnalysisStatus.LOADING}
           className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
           <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AIAnalysis;
