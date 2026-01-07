
import { GoogleGenAI } from "@google/genai";
import { FinancialInputs, CalculationResults, AIConfig } from "../types";

const generatePrompt = (inputs: FinancialInputs, results: CalculationResults, customQuestion?: string) => {
  const { aiConfig } = inputs;
  const tpDescription = inputs.tpMode === 'rate'
    ? `目标毛利率: ${inputs.tpRate}%`
    : `目标毛利润: ${inputs.tp} 元`;

  const langHint = aiConfig.language === 'en' ? "Please reply in English." : "请使用中文回答。";

  // Build Detailed Context
  let fcDetailsText = "";
  if (inputs.fcMode === 'detailed' && inputs.fcDetails.length > 0) {
    fcDetailsText = "\n[固定成本明细]\n" + inputs.fcDetails.map(item => `  - ${item.name}: ${item.amount} 元`).join('\n');
  }

  let productDetailsText = "";
  if (inputs.productMode === 'detailed' && inputs.productDetails.length > 0) {
    productDetailsText = "\n[产品组合明细]\n" + inputs.productDetails.map(item => 
      `  - ${item.name}: 售价=${item.p} 元, VC=${item.vc} 元, 销量权重=${item.mix}`
    ).join('\n');
  }

  const contextData = `
【财务模型核心数据】
- 固定成本总额 (FC): ${inputs.fc} 元
- 加权平均售价 (P): ${inputs.p} 元
- 加权平均变动成本 (VC): ${inputs.vc} 元
- ${tpDescription}
- 销售费用: ${inputs.salesExpenses} 元
- 目标净利润: ${inputs.targetNetProfit} 元
${fcDetailsText}
${productDetailsText}

【计算结果指标】
- 单位贡献毛利 (CM): ${results.cm} 元
- 贡献毛利率 (CMR): ${(results.cmr * 100).toFixed(2)}%
- 毛利盈亏平衡点 (BEP-Gross): ${results.bepUnits.toFixed(0)} 单位 / ${results.bepAmount.toFixed(2)} 元 (仅覆盖固定成本)
- 净利盈亏平衡点 (BEP-Net): ${results.bepNetUnits.toFixed(0)} 单位 / ${results.bepNetAmount.toFixed(2)} 元 (覆盖固定成本+销售费用)
- 目标销售需求: ${results.targetUnits.toFixed(0)} 单位 / ${results.targetAmount.toFixed(2)} 元
- 安全边际率: ${(results.safetyMargin * 100).toFixed(2)}%

【在目标销量下的成本预测】
- 预计业务成本 (FC+VC): ${results.totalBusinessCost.toFixed(2)} 元
- 预计总支出 (含销售费用): ${results.totalAllCost.toFixed(2)} 元
- 预计净利润: ${results.effectiveNetTp.toFixed(2)} 元
`;

  if (customQuestion) {
      return `
你是一个专业的财务顾问。请基于以下提供的【财务模型数据上下文】来回答用户的具体问题。${langHint}

${contextData}

用户问题：${customQuestion}

要求：
1. 请直接回答问题，不要重复罗列所有数据。
2. 回答时请引用上述上下文中的具体数据（如明细项）作为依据。
3. 保持专业、客观、简洁。
`;
  }

  return `
你是一个专业的财务顾问，专门服务于细胞制备和生物试剂企业。请根据以下的【财务模型数据上下文】进行简要的经营分析和建议。${langHint}
${contextData}

请提供以下内容（保持简洁，Markdown格式）：
1. **经营状况评价**：基于安全边际率和净利平衡点评价当前模型的风险水平。
2. **优化建议**：结合具体成本明细、销售费用或产品组合特点，提出2-3条具体的改进建议。
3. **风险提示**：指出一个最关键的潜在风险点。
`;
};

export const getFinancialAnalysis = async (inputs: FinancialInputs, results: CalculationResults, question?: string): Promise<string> => {
  const { aiConfig } = inputs;
  const prompt = generatePrompt(inputs, results, question);

  if (aiConfig.provider === 'google') {
    return callGoogleGemini(aiConfig, prompt);
  } else {
    return callCustomProvider(aiConfig, prompt);
  }
};

async function callGoogleGemini(config: AIConfig, prompt: string): Promise<string> {
  try {
    // Priority: Manual Input Key > Environment Variable
    const apiKey = config.googleApiKey || process.env.API_KEY;
    
    if (!apiKey) {
      return "未检测到 Google API Key。请在设置中手动输入 Key 或连接 API Studio。";
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: config.model || 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });

    return response.text || "无法生成分析结果。";
  } catch (error: any) {
    console.error("Google AI Error:", error);
    if (error?.message?.includes("Requested entity was not found")) {
      return "Key 无效或项目未找到，请检查您的 API Key 是否正确，且关联项目已开启计费。";
    }
    return `分析服务错误: ${error?.message || '未知原因'}`;
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
