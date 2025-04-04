export interface Trade {
  id: string;
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