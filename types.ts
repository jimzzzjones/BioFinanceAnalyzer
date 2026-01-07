
export interface FCItem {
  id: string;
  name: string;
  amount: number;
}

export interface ProductItem {
  id: string;
  name: string;
  p: number;
  vc: number;
  mix: number; 
}

export interface AIConfig {
  provider: 'google' | 'custom';
  model: string;
  language: 'zh' | 'en';
  
  // Google API Manual Fallback
  googleApiKey?: string;

  // Custom API settings for domestic/other models
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
}

export interface SavedAIConfig {
  id: string;
  name: string;
  config: AIConfig;
  createdAt: number;
}

export interface FinancialInputs {
  fc: number;
  p: number;
  vc: number;
  
  // tp now represents Target Gross Profit
  tp: number;
  tpMode: 'amount' | 'rate';
  tpRate: number;

  // New fields
  salesExpenses: number;
  targetNetProfit: number;

  fcMode: 'simple' | 'detailed';
  fcDetails: FCItem[];

  productMode: 'simple' | 'detailed';
  productDetails: ProductItem[];

  aiConfig: AIConfig;
}

export interface CalculationResults {
  cm: number;
  cmr: number;
  
  // Gross Break-Even (covers FC)
  bepUnits: number;
  bepAmount: number;
  
  // Net Break-Even (covers FC + Sales Expenses)
  bepNetUnits: number;
  bepNetAmount: number;

  targetUnits: number;
  targetAmount: number;
  
  // Cost breakdown at target volume
  totalVC: number;          // Total Variable Cost
  totalBusinessCost: number; // FC + Total VC
  totalAllCost: number;      // Business Cost + Sales Expenses

  // Effective results at target volume
  effectiveGrossTp: number; // Gross Profit
  effectiveNetTp: number;   // Net Profit
  
  safetyMargin: number;
  isValid: boolean;
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  inputs: FinancialInputs;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
