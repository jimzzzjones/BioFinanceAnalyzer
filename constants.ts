
import { FinancialInputs } from "./types";

export const DEFAULT_INPUTS: FinancialInputs = {
    fc: 2000000,
    p: 15000,
    vc: 5000,
    tp: 1000000,
    
    tpMode: 'amount',
    tpRate: 20,
    
    fcMode: 'simple',
    fcDetails: [
        { id: '1', name: '厂房租金 & 物业', amount: 800000 },
        { id: '2', name: '技术人员薪资', amount: 900000 },
        { id: '3', name: '设备折旧摊销', amount: 200000 },
        { id: '4', name: '行政与市场费用', amount: 100000 },
    ],

    productMode: 'simple',
    productDetails: [
        { id: '1', name: '基础细胞存储', p: 8000, vc: 2000, mix: 40 },
        { id: '2', name: '标准细胞制备', p: 18000, vc: 6000, mix: 50 },
        { id: '3', name: '高端定制服务', p: 35000, vc: 12000, mix: 10 },
    ],

    aiConfig: {
      provider: 'google',
      model: 'gemini-3-pro-preview',
      language: 'zh',
      customBaseUrl: 'https://api.deepseek.com/v1',
      customModel: 'deepseek-chat'
    }
};
