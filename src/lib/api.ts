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
      comments: trade.comments,
      day: trade.day,
      direction: trade.direction,
      order_type: trade.orderType,
      market_condition: trade.marketCondition,
      ma: trade.ma,
      fib: trade.fib,
      gap: trade.gap,
      mindset: trade.mindset,
      trade_link: trade.tradeLink,
      true_reward: trade.trueReward,
      true_tp_sl: trade.true_tp_sl
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
  if (trade.day) updates.day = trade.day;
  if (trade.direction) updates.direction = trade.direction;
  if (trade.orderType) updates.order_type = trade.orderType;
  if (trade.marketCondition) updates.market_condition = trade.marketCondition;
  if (trade.ma) updates.ma = trade.ma;
  if (trade.fib) updates.fib = trade.fib;
  if (trade.gap) updates.gap = trade.gap;
  if (trade.mindset) updates.mindset = trade.mindset;
  if (trade.tradeLink) updates.trade_link = trade.tradeLink;
  if (trade.trueReward) updates.true_reward = trade.trueReward;
  if (trade.true_tp_sl) updates.true_tp_sl = trade.true_tp_sl;

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // Even for admins, we'll filter by their user_id 
  // to ensure they only see their own trades in the trade history table
  const { data, error } = await supabase
    .from('trades')
    .select(`
      id,
      user_id,
      date,
      pair,
      action,
      entry_time,
      exit_time,
      lots,
      pip_stop_loss,
      pip_take_profit,
      profit_loss,
      pivots,
      banking_level,
      risk_ratio,
      comments,
      day,
      direction,
      order_type,
      market_condition,
      ma,
      fib,
      gap,
      mindset,
      trade_link,
      true_reward,
      true_tp_sl
    `)
    .eq('user_id', user.id) // Always filter by current user's ID, regardless of role
    .order('date', { ascending: false });

  if (error) throw error;

  // Convert snake_case to camelCase
  return data.map(trade => ({
    id: trade.id,
    userId: trade.user_id,
    date: trade.date,
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
    day: trade.day,
    direction: trade.direction,
    orderType: trade.order_type,
    marketCondition: trade.market_condition,
    ma: trade.ma,
    fib: trade.fib,
    gap: trade.gap,
    mindset: trade.mindset,
    tradeLink: trade.trade_link,
    trueReward: trade.true_reward,
    true_tp_sl: trade.true_tp_sl
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

export async function updatePerformanceMetrics(metrics: Omit<PerformanceMetrics, 'id'> & { month: string }) {
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

// Cell customization types
export interface CellCustomization {
  id?: string;
  tradeId: string;
  columnKey: string;
  backgroundColor: string;
  textColor: string;
}

export async function loadCellCustomizations(userIdToLoad?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data: userData } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  const isAdmin = userData?.role === 'admin';
  
  let query = supabase
    .from('cell_customizations')
    .select('*');
  
  // If admin is loading specific user's customizations
  if (isAdmin && userIdToLoad) {
    query = query.eq('user_id', userIdToLoad);
  }
  // If not admin, filter by own user_id
  else if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }
  // If admin loading all customizations (for admin settings page, perhaps), no filter needed
  
  const { data, error } = await query;
    
  if (error) {
    console.error('Error loading cell customizations:', error);
    return [];
  }
  
  // Map from DB format to frontend format
  return data.map(item => ({
    id: item.id,
    tradeId: item.trade_id,
    columnKey: item.column_key,
    backgroundColor: item.background_color || '',
    textColor: item.text_color || '',
    userId: item.user_id // Include userId
  }));
}

export async function saveCellCustomization(customization: CellCustomization, targetUserId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data: userData } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
    
  const isAdmin = userData?.role === 'admin';
  const userIdToSave = (isAdmin && targetUserId) ? targetUserId : user.id;

  // Check if customization already exists for the target user
  const { data: existing } = await supabase
    .from('cell_customizations')
    .select('id')
    .eq('user_id', userIdToSave)
    .eq('trade_id', customization.tradeId)
    .eq('column_key', customization.columnKey)
    .maybeSingle();
    
  if (existing) {
    // Update existing customization
    const { error } = await supabase
      .from('cell_customizations')
      .update({
        background_color: customization.backgroundColor,
        text_color: customization.textColor
      })
      .eq('id', existing.id);
      
    if (error) throw error;
    return { ...customization, id: existing.id, userId: userIdToSave };
  } else {
    // Insert new customization
    const { data, error } = await supabase
      .from('cell_customizations')
      .insert({
        user_id: userIdToSave,
        trade_id: customization.tradeId,
        column_key: customization.columnKey,
        background_color: customization.backgroundColor,
        text_color: customization.textColor
      })
      .select()
      .single();
      
    if (error) throw error;
    return {
      id: data.id,
      tradeId: data.trade_id,
      columnKey: data.column_key,
      backgroundColor: data.background_color || '',
      textColor: data.text_color || '',
      userId: data.user_id // Return the user ID it was saved for
    };
  }
}

export async function deleteCellCustomization(tradeId: string, columnKey: string, targetUserId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Determine which user ID to use
  const userIdToUse = targetUserId || user.id;

  const { error } = await supabase
    .from('cell_customizations')
    .delete()
    .eq('trade_id', tradeId)
    .eq('column_key', columnKey)
    .eq('user_id', userIdToUse);

  if (error) throw error;
}

// Admin function to get all trades across users
export async function getAllTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select(`
      id,
      user_id,
      date,
      pair,
      action,
      entry_time,
      exit_time,
      lots,
      pip_stop_loss,
      pip_take_profit,
      profit_loss,
      pivots,
      banking_level,
      risk_ratio,
      comments,
      day,
      direction,
      order_type,
      market_condition,
      ma,
      fib,
      gap,
      mindset,
      trade_link,
      true_reward,
      true_tp_sl
    `)
    .order('date', { ascending: false });

  if (error) throw error;

  // Convert snake_case to camelCase
  return data.map(trade => ({
    id: trade.id,
    userId: trade.user_id,
    date: trade.date,
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
    day: trade.day,
    direction: trade.direction,
    orderType: trade.order_type,
    marketCondition: trade.market_condition,
    ma: trade.ma,
    fib: trade.fib,
    gap: trade.gap,
    mindset: trade.mindset,
    tradeLink: trade.trade_link,
    trueReward: trade.true_reward,
    true_tp_sl: trade.true_tp_sl
  }));
}

// Trading Rules Management
export async function getUserTradingRules(userId: string) {
  const { data, error } = await supabase
    .from('user_trading_rules')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  return data.map(rule => ({
    id: rule.id,
    userId: rule.user_id,
    ruleType: rule.rule_type,
    allowedValues: rule.allowed_values,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at
  }));
}

export async function createTradingRule(rule: Omit<import('../types').UserTradingRule, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('user_trading_rules')
    .insert({
      user_id: rule.userId,
      rule_type: rule.ruleType,
      allowed_values: rule.allowedValues
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTradingRule(id: string, rule: Partial<Omit<import('../types').UserTradingRule, 'id'>>) {
  const updates: Record<string, any> = {};
  
  if (rule.ruleType) updates.rule_type = rule.ruleType;
  if (rule.allowedValues) updates.allowed_values = rule.allowedValues;

  const { data, error } = await supabase
    .from('user_trading_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTradingRule(id: string) {
  const { error } = await supabase
    .from('user_trading_rules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Trade Violations Management
export async function getTradeViolations(userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const query = supabase
    .from('trade_violations')
    .select(`
      *,
      trades(*)
    `);

  // If a userId is specified, filter by it (for admin viewing)
  // Otherwise, use the current user's ID
  const finalQuery = userId ? query.eq('user_id', userId) : query.eq('user_id', user.id);
  
  const { data, error } = await finalQuery.order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(violation => ({
    id: violation.id,
    tradeId: violation.trade_id,
    userId: violation.user_id,
    ruleType: violation.rule_type,
    violatedValue: violation.violated_value,
    allowedValues: violation.allowed_values,
    acknowledged: violation.acknowledged,
    createdAt: violation.created_at,
    trade: violation.trades ? {
      id: violation.trades.id,
      date: violation.trades.date,
      pair: violation.trades.pair,
      action: violation.trades.action,
      profitLoss: violation.trades.profit_loss
    } : null
  }));
}

export async function createTradeViolation(violation: Omit<import('../types').TradeViolation, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('trade_violations')
    .insert({
      trade_id: violation.tradeId,
      user_id: violation.userId,
      rule_type: violation.ruleType,
      violated_value: violation.violatedValue,
      allowed_values: violation.allowedValues,
      acknowledged: violation.acknowledged || false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function acknowledgeTradeViolation(id: string) {
  const { data, error } = await supabase
    .from('trade_violations')
    .update({ acknowledged: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Function to check trade against user rules
export async function checkTradeAgainstRules(
  trade: Partial<import('../types').Trade>, 
  userId: string
): Promise<{ isValid: boolean; violations: { ruleType: string; violatedValue: string; allowedValues: string[] }[] }> {
  // Get user trading rules
  const rules = await getUserTradingRules(userId);
  const violations = [];

  // Check each rule type
  for (const rule of rules) {
    let violatedValue = null;

    switch(rule.ruleType) {
      case 'pair':
        if (trade.pair && !rule.allowedValues.includes(trade.pair)) {
          violatedValue = trade.pair;
        }
        break;
      case 'day':
        if (trade.day && !rule.allowedValues.includes(trade.day)) {
          violatedValue = trade.day;
        }
        break;
      case 'direction':
        if (trade.direction && !rule.allowedValues.includes(trade.direction)) {
          violatedValue = trade.direction;
        }
        break;
      case 'lot':
        if (trade.lots !== undefined) {
          // For lots, we expect allowedValues to contain min-max ranges like "0.01-0.5"
          const isValid = rule.allowedValues.some((range: string) => {
            const [min, max] = range.split('-').map(parseFloat);
            return trade.lots! >= min && trade.lots! <= max;
          });
          
          if (!isValid) {
            violatedValue = trade.lots.toString();
          }
        }
        break;
    }

    if (violatedValue) {
      violations.push({
        ruleType: rule.ruleType,
        violatedValue,
        allowedValues: rule.allowedValues
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}