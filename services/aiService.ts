
import { GoogleGenAI } from "@google/genai";
import { FinancialInputs, CalculationResults } from "../types";

const generatePrompt = (inputs: FinancialInputs, results: CalculationResults) => {
  const { aiConfig } = inputs;
  const tpDescription = inputs.tpMode === 'rate'
    ? `目标利润率: ${inputs.tpRate}% (对应目标利润额: ${results.effectiveTp.toFixed(2)} 元)`
    : `目标利润 (固定金额): ${inputs.tp} 元`;

  const langHint = aiConfig.language === 'en' ? "Please reply in English." : "请使用中文回答。";

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
  const { aiConfig } = inputs;
  const prompt = generatePrompt(inputs, results);

  if (aiConfig.provider === 'google') {
    return callGoogleGemini(aiConfig.model, prompt);
  } else {
    return callCustomProvider(aiConfig, prompt);
  }
};

async function callGoogleGemini(model: string, prompt: string): Promise<string> {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "未连接 Google API 密钥，请在设置中选择 API Key。";

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    return response.text || "无法生成分析结果。";
  } catch (error: any) {
    console.error("Google AI Error:", error);
    if (error?.message?.includes("Requested entity was not found")) {
      return "项目未找到或 API 密钥无效，请重新选择有效的付费项目。";
    }
    throw error;
  }
}

async function callCustomProvider(config: any, prompt: string): Promise<string> {
  const { customBaseUrl, customApiKey, customModel } = config;
  
  if (!customBaseUrl || !customModel) {
    return "自定义 API 配置不完整（缺少 Base URL 或 Model ID）。";
  }

  try {
    const response = await fetch(`${customBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customApiKey || ''}`
      },
      body: JSON.stringify({
        model: customModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "自定义模型未返回有效内容。";
  } catch (error: any) {
    console.error("Custom AI Error:", error);
    throw new Error(`国内/自定义模型请求失败: ${error.message}`);
  }
}
