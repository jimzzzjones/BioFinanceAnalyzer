
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
  // Custom API settings for domestic/other models
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
}

export interface FinancialInputs {
  fc: number;
  p: number;
  vc: number;
  
  tp: number;
  tpMode: 'amount' | 'rate';
  tpRate: number;

  fcMode: 'simple' | 'detailed';
  fcDetails: FCItem[];

  productMode: 'simple' | 'detailed';
  productDetails: ProductItem[];

  aiConfig: AIConfig;
}

export interface CalculationResults {
  cm: number;
  cmr: number;
  bepUnits: number;
  bepAmount: number;
  targetUnits: number;
  targetAmount: number;
  effectiveTp: number;
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
