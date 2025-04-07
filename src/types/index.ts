export interface Trade {
  id: string;
  userId?: string;
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
}

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  averageRRR: number;
  totalProfitLoss: number;
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