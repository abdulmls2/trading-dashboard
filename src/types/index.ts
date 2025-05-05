export interface Trade {
  id: string;
  userId?: string;
  accountId?: string;
  date: string;
  time: string;
  pair: string;
  action: 'Buy' | 'Sell';
  entryTime: string;
  exitTime: string;
  lots: number;
  pipStopLoss: number;
  pipTakeProfit: number;
  profitLoss: number;
  drawdown: number;
  pivots: string;
  bankingLevel: string;
  riskRatio: number;
  comments: string;
  day: string;
  direction: string;
  orderType: string;
  marketCondition: string;
  ma: string;
  fib: string;
  gap: string;
  mindset: string;
  tradeLink: string;
  trueReward: string;
  true_tp_sl: string;
  additional_confluences: string;
  top_bob_fv: string;
  created_at?: string;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface PerformanceMetrics {
  id?: string;
  userId?: string;
  accountId?: string;
  totalTrades: number;
  winRate: number;
  averageRRR: number;
  totalProfitLoss: number;
  month?: string;
  createdAt?: string;
  updatedAt?: string;
  monthlyPipTarget?: number;
  capital?: number;
  violationsCount?: number;
}

export interface CellCustomization {
  id?: string;
  tradeId: string;
  columnKey: string;
  backgroundColor: string;
  textColor: string;
  userId?: string;
}

export interface UserTradingRule {
  id?: string;
  userId: string;
  ruleType: 'pair' | 'day' | 'lot' | 'action_direction';
  allowedValues: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TradeViolation {
  id?: string;
  tradeId: string;
  userId: string;
  ruleType: 'pair' | 'day' | 'lot' | 'action_direction';
  violatedValue: string;
  allowedValues: string[];
  acknowledged: boolean;
  createdAt?: string;
}

export interface TradeCalendarDay {
  date: Date;
  trades: Trade[];
  totalProfitLoss: number;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
}