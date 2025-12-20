
import { GoogleGenAI } from "@google/genai";
import { FinancialInputs, CalculationResults } from "../types";

const generatePrompt = (inputs: FinancialInputs, results: CalculationResults) => {
  const tpDescription = inputs.tpMode === 'rate'
    ? `目标利润率: ${inputs.tpRate}% (对应目标利润额: ${results.effectiveTp.toFixed(2)} 元)`
    : `目标利润 (固定金额): ${inputs.tp} 元`;

  // Fix: Access language property from aiConfig as defined in FinancialInputs type
  const langHint = inputs.aiConfig.language === 'en' ? "Please reply in English." : "请使用中文回答。";

  return `
你是一个专业的财务顾问，专门服务于细胞制备和生物试剂企业。请根据以下的财务数据进行简要的经营分析和建议。${langHint}

【输入数据】
- 固定成本 (FC): ${inputs.fc} 元
- 产品单价 (P): ${inputs.p} 元
- 单位变动成本 (VC): ${inputs.vc} 元
- ${tpDescription}

【计算结果】
- 单位贡献毛利 (CM): ${results.cm} 元
- 贡献毛利率 (CMR): ${(results.cmr * 100).toFixed(2)}%
- 盈亏平衡点: ${results.bepUnits.toFixed(0)} 单位 / ${results.bepAmount.toFixed(2)} 元
- 目标销售需求: ${results.targetUnits.toFixed(0)} 单位 / ${results.targetAmount.toFixed(2)} 元
- 安全边际率: ${(results.safetyMargin * 100).toFixed(2)}%

请提供以下内容（保持简洁，Markdown格式）：
1. **经营状况评价**：基于安全边际率和毛利率评价当前模型的风险水平。
2. **优化建议**：针对细胞制备行业的特点，提出2-3条具体的改进建议。
3. **风险提示**：指出一个最关键的潜在风险点。
`;
};

export const getFinancialAnalysis = async (inputs: FinancialInputs, results: CalculationResults): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "请在设置中配置 API Key 以获取 AI 智能分析报告。";
    }

    // Always create a fresh instance to use the most up-to-date key
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      // Fix: Access model property from aiConfig as defined in FinancialInputs type
      model: inputs.aiConfig.model || 'gemini-3-pro-preview',
      contents: generatePrompt(inputs, results),
      config: {
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    return response.text || "无法生成分析结果。";
  } catch (error: any) {
    console.error("Error fetching AI analysis:", error);
    if (error?.message?.includes("Requested entity was not found")) {
      return "API 密钥或项目未找到，请点击右上角 [API 设置] 重新选择有效的付费项目密钥。";
    }
    return `分析服务暂时不可用: ${error?.message || '未知错误'}`;
  }
};