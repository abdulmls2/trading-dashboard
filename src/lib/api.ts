import { supabase } from './supabase';
import { Trade, PerformanceMetrics } from '../types';

export async function createTrade(trade: Omit<Trade, 'id' | 'time'>) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('trades')
    .insert([{
      user_id: user?.id,
      date: trade.date,
      pair: trade.pair,
      action: trade.action,
      entry_time: trade.entryTime,
      exit_time: trade.exitTime,
      lots: trade.lots,
      pip_stop_loss: trade.pipStopLoss,
      pip_take_profit: trade.pipTakeProfit,
      profit_loss: trade.profitLoss,
      pivots: trade.pivots,
      banking_level: trade.bankingLevel,
      risk_ratio: trade.riskRatio,
      comments: trade.comments
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrade(id: string, trade: Partial<Omit<Trade, 'time'>>) {
  const updates: Record<string, any> = {};
  
  if (trade.date) updates.date = trade.date;
  if (trade.pair) updates.pair = trade.pair;
  if (trade.action) updates.action = trade.action;
  if (trade.entryTime) updates.entry_time = trade.entryTime;
  if (trade.exitTime) updates.exit_time = trade.exitTime;
  if (trade.lots) updates.lots = trade.lots;
  if (trade.pipStopLoss) updates.pip_stop_loss = trade.pipStopLoss;
  if (trade.pipTakeProfit) updates.pip_take_profit = trade.pipTakeProfit;
  if (trade.profitLoss) updates.profit_loss = trade.profitLoss;
  if (trade.pivots) updates.pivots = trade.pivots;
  if (trade.bankingLevel) updates.banking_level = trade.bankingLevel;
  if (trade.riskRatio) updates.risk_ratio = trade.riskRatio;
  if (trade.comments) updates.comments = trade.comments;

  const { data, error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrade(id: string) {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;

  // Convert snake_case to camelCase
  return data.map(trade => ({
    id: trade.id,
    userId: trade.user_id,
    date: trade.date,
    time: trade.time,
    pair: trade.pair,
    action: trade.action,
    entryTime: trade.entry_time,
    exitTime: trade.exit_time,
    lots: trade.lots,
    pipStopLoss: trade.pip_stop_loss,
    pipTakeProfit: trade.pip_take_profit,
    profitLoss: trade.profit_loss,
    pivots: trade.pivots,
    bankingLevel: trade.banking_level,
    riskRatio: trade.risk_ratio,
    comments: trade.comments,
    createdAt: trade.created_at
  }));
}

export async function getPerformanceMetrics(month: string) {
  const { data, error } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('month', month)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    totalTrades: data.total_trades,
    winRate: data.win_rate,
    averageRRR: data.average_rrr,
    totalProfitLoss: data.total_profit_loss,
    month: data.month,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updatePerformanceMetrics(metrics: Omit<PerformanceMetrics, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('performance_metrics')
    .upsert([{
      user_id: user?.id,
      total_trades: metrics.totalTrades,
      win_rate: metrics.winRate,
      average_rrr: metrics.averageRRR,
      total_profit_loss: metrics.totalProfitLoss,
      month: metrics.month
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function calculateMonthlyMetrics(month: string) {
  const startDate = new Date(month);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  if (error) throw error;

  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      averageRRR: 0,
      totalProfitLoss: 0,
      month: startDate
    };
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter(trade => trade.profit_loss > 0).length;
  const winRate = (winningTrades / totalTrades) * 100;
  const totalProfitLoss = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const averageRRR = trades.reduce((sum, trade) => sum + trade.risk_ratio, 0) / totalTrades;

  return {
    totalTrades,
    winRate,
    averageRRR,
    totalProfitLoss,
    month: startDate
  };
}