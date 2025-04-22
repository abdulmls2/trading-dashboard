import { supabase } from './supabase';
import { Trade, PerformanceMetrics } from '../types';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Custom hook to get the effective user ID, considering impersonation
export function useEffectiveUserId() {
  const { effectiveUserId } = useAuth();
  
  // Return the effective user ID directly
  return effectiveUserId;
}

export async function createTrade(trade: Omit<Trade, 'id' | 'time'>, targetUserId?: string | null, accountId?: string | null) {
  // If targetUserId is provided and not null, use it (for admin impersonation)
  // Otherwise, get the current user
  let userId: string;
  
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  // If no accountId is provided, get the default account
  if (!accountId) {
    const { data: accounts } = await supabase
      .from('trading_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1);
      
    if (accounts && accounts.length > 0) {
      accountId = accounts[0].id;
    }
  }
  
  const { data, error } = await supabase
    .from('trades')
    .insert([{
      user_id: userId,
      account_id: accountId,
      date: trade.date,
      pair: trade.pair,
      action: trade.action,
      entry_time: trade.entryTime,
      exit_time: trade.exitTime === '' ? null : trade.exitTime,
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
      trade_link: trade.tradeLink === '' ? null : trade.tradeLink,
      true_reward: trade.trueReward,
      true_tp_sl: trade.true_tp_sl,
      additional_confluences: trade.additional_confluences,
      top_bob_fv: trade.top_bob_fv
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
  if (trade.exitTime !== undefined) updates.exit_time = trade.exitTime === '' ? null : trade.exitTime;
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
  if (trade.tradeLink !== undefined) updates.trade_link = trade.tradeLink === '' ? null : trade.tradeLink;
  if (trade.trueReward) updates.true_reward = trade.trueReward;
  if (trade.true_tp_sl) updates.true_tp_sl = trade.true_tp_sl;
  if (trade.additional_confluences) updates.additional_confluences = trade.additional_confluences;
  if (trade.top_bob_fv) updates.top_bob_fv = trade.top_bob_fv;

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

export async function getTrades(targetUserId?: string | null, accountId?: string | null) {
  // If targetUserId is provided and not null, use it (for admin impersonation)
  // Otherwise, get the current user
  let userId: string;
  
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  // Start building the query
  let query = supabase
    .from('trades')
    .select(`
      id,
      user_id,
      account_id,
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
      true_tp_sl,
      additional_confluences,
      top_bob_fv,
      created_at
    `)
    .eq('user_id', userId);

  // If accountId is provided, filter by it
  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  // Execute the query
  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;

  // Convert snake_case to camelCase
  return data.map(trade => ({
    id: trade.id,
    userId: trade.user_id,
    accountId: trade.account_id,
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
    true_tp_sl: trade.true_tp_sl,
    additional_confluences: trade.additional_confluences,
    top_bob_fv: trade.top_bob_fv,
    created_at: trade.created_at
  }));
}

export async function getPerformanceMetrics(month: string, targetUserId?: string | null, accountId?: string | null) {
  // If targetUserId is provided and not null, use it (for admin impersonation)
  // Otherwise, get the current user
  let userId: string;
  
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  const query = supabase
    .from('performance_metrics')
    .select('*')
    .eq('month', month)
    .eq('user_id', userId);

  // Add account_id filter if provided
  if (accountId) {
    query.eq('account_id', accountId);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching performance metrics:", error);
    throw error;
  }
  
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
    updatedAt: data.updated_at,
    monthlyPipTarget: data.monthly_pip_target,
    capital: data.capital,
    accountId: data.account_id
  };
}

export async function updatePerformanceMetrics(metrics: Partial<Omit<PerformanceMetrics, 'id'>> & { month: string }, targetUserId?: string, accountId?: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const userIdToUpsert = targetUserId || user.id;

  const upsertData: Record<string, any> = {
    user_id: userIdToUpsert,
    month: metrics.month
  };

  // Add account_id to upsert data if provided
  if (accountId) {
    upsertData.account_id = accountId;
  }

  if (metrics.totalTrades !== undefined) upsertData.total_trades = metrics.totalTrades;
  if (metrics.winRate !== undefined) upsertData.win_rate = metrics.winRate;
  if (metrics.averageRRR !== undefined) upsertData.average_rrr = metrics.averageRRR;
  if (metrics.totalProfitLoss !== undefined) upsertData.total_profit_loss = metrics.totalProfitLoss;
  if (metrics.monthlyPipTarget !== undefined) upsertData.monthly_pip_target = metrics.monthlyPipTarget;
  if (metrics.capital !== undefined) upsertData.capital = metrics.capital;

  try {
    // Try with account_id in the conflict keys first (if accountId is provided)
    if (accountId) {
      const { data, error } = await supabase
        .from('performance_metrics')
        .upsert([upsertData], { onConflict: 'user_id, month, account_id' })
        .select()
        .single();

      if (!error) {
        return {
          id: data.id,
          userId: data.user_id,
          totalTrades: data.total_trades,
          winRate: data.win_rate,
          averageRRR: data.average_rrr,
          totalProfitLoss: data.total_profit_loss,
          month: data.month,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          monthlyPipTarget: data.monthly_pip_target,
          capital: data.capital,
          accountId: data.account_id
        };
      }

      // If we get here, there was an error with the account_id conflict key
      console.warn("Error using account_id in conflict key, falling back to user_id and month only:", error);
    }

    // Fallback to just user_id and month (this will work even if account_id column doesn't exist yet)
  const { data, error } = await supabase
    .from('performance_metrics')
    .upsert([upsertData], { onConflict: 'user_id, month' })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    totalTrades: data.total_trades,
    winRate: data.win_rate,
    averageRRR: data.average_rrr,
    totalProfitLoss: data.total_profit_loss,
    month: data.month,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    monthlyPipTarget: data.monthly_pip_target,
      capital: data.capital,
      accountId: data.account_id
  };
  } catch (error) {
    console.error("Error updating performance metrics:", error);
    throw error;
  }
}

export async function calculateMonthlyMetrics(month: string, targetUserId?: string, accountId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const userIdToFetch = targetUserId || user.id;

  const startDate = new Date(month);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', userIdToFetch)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  // Filter by account if provided
  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  const { data: trades, error } = await query;

  if (error) throw error;

  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      averageRRR: 0,
      totalProfitLoss: 0,
      month: startDate,
      accountId: accountId
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
    month: startDate,
    accountId: accountId
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
      true_tp_sl,
      additional_confluences,
      top_bob_fv,
      created_at
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
    true_tp_sl: trade.true_tp_sl,
    additional_confluences: trade.additional_confluences,
    top_bob_fv: trade.top_bob_fv,
    created_at: trade.created_at
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
export async function getTradeViolations(userId?: string, accountId?: string | null, showAll?: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Determine the user ID to fetch violations for
  const targetUserId = showAll ? undefined : (userId || user.id);

  // Build the base query for violations
  let violationQuery = supabase
    .from('trade_violations')
    .select(`
      id,
      trade_id,
      user_id,
      rule_type,
      violated_value,
      allowed_values,
      acknowledged,
      created_at,
      trades (
        id,
        date,
        pair,
        action,
        profit_loss,
        account_id 
      )
    `);

  // Apply user filter if needed
  if (targetUserId) {
    violationQuery = violationQuery.eq('user_id', targetUserId);
  }

  // Execute the violation query
  const { data: violationsData, error: violationsError } = await violationQuery.order('created_at', { ascending: false });

  if (violationsError) throw violationsError;
  
  if (!violationsData || violationsData.length === 0) return [];

  // Filter violations based on accountId if provided
  let filteredViolations = violationsData;
  if (accountId) {
    filteredViolations = violationsData.filter(v => {
      // Check if trades data exists and is the expected object (or array with one object)
      const trade = Array.isArray(v.trades) ? v.trades[0] : v.trades;
      return trade && trade.account_id === accountId;
    });
  }
  
  if (filteredViolations.length === 0) return [];
  
  // Extract unique user IDs from the final filtered violations
  const userIds = [...new Set(filteredViolations.map(v => v.user_id))];
  
  // Get profile information for these users
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, username')
    .in('user_id', userIds);

  if (profilesError) {
      console.error("Error fetching profiles for violations:", profilesError);
  }
    
  // Create a mapping of user_id to profile
  interface ProfileInfo {
    email: string;
    fullName: string | null;
    username: string | null;
  }
  
  const profileMap: Record<string, ProfileInfo> = {};
  
  (profilesData || []).forEach(profile => {
    profileMap[profile.user_id] = {
      email: profile.email,
      fullName: profile.full_name,
      username: profile.username
    };
  });

  // Map the final filtered violations to the desired output format
  return filteredViolations.map(violation => {
    // Handle the case where trades might be an array or an object
    const tradeData = Array.isArray(violation.trades) ? violation.trades[0] : violation.trades;
    
    return {
    id: violation.id,
    tradeId: violation.trade_id,
    userId: violation.user_id,
    ruleType: violation.rule_type,
    violatedValue: violation.violated_value,
    allowedValues: violation.allowed_values,
    acknowledged: violation.acknowledged,
    createdAt: violation.created_at,
      trade: tradeData ? {
        id: tradeData.id,
        date: tradeData.date,
        pair: tradeData.pair,
        action: tradeData.action,
        profitLoss: tradeData.profit_loss,
        accountId: tradeData.account_id
    } : null,
    user: profileMap[violation.user_id] || null
    };
  });
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
  console.log('All rules to check:', rules);
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
      case 'action_direction':
        // Check if the trade is going against the trend (Buy when Bearish or Sell when Bullish)
        console.log('Checking action_direction rule:', {
          allowedValues: rule.allowedValues,
          action: trade.action,
          direction: trade.direction
        });
        
        if (rule.allowedValues.includes('No') && 
            trade.action && trade.direction && 
            ((trade.action === 'Buy' && trade.direction === 'Bearish') || 
             (trade.action === 'Sell' && trade.direction === 'Bullish'))) {
          
          console.log('Violation detected: going against trend');
          violatedValue = `${trade.action} when ${trade.direction}`;
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

// Trading Accounts
export async function getUserTradingAccounts(targetUserId?: string | null) {
  let userId: string;
  
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTradingAccount(name: string, description: string = '', isDefault: boolean = false, targetUserId?: string | null) {
  let userId: string;
  
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  // If this account is set as default, we need to unset any existing default accounts
  if (isDefault) {
    await supabase
      .from('trading_accounts')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabase
    .from('trading_accounts')
    .insert({
      user_id: userId,
      name,
      description,
      is_default: isDefault
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setDefaultTradingAccount(accountId: string, targetUserId?: string | null) {
  let userId: string;
  
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    userId = user.id;
  }

  // First, unset all default accounts for this user
  await supabase
    .from('trading_accounts')
    .update({ is_default: false })
    .eq('user_id', userId);

  // Then set the selected account as default
  const { data, error } = await supabase
    .from('trading_accounts')
    .update({ is_default: true })
    .eq('id', accountId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTradingAccount(accountId: string) {
  // Check if this is the only account
  const { count } = await supabase
    .from('trading_accounts')
    .select('*', { count: 'exact', head: true });
    
  if (count === 1) {
    throw new Error('Cannot delete the only trading account');
  }
  
  // Check if this is the default account
  const { data: account } = await supabase
    .from('trading_accounts')
    .select('is_default')
    .eq('id', accountId)
    .single();
    
  // Get another account to set as default if this is the default
  if (account?.is_default) {
    const { data: otherAccount } = await supabase
      .from('trading_accounts')
      .select('id')
      .neq('id', accountId)
      .limit(1)
      .single();
      
    if (otherAccount) {
      await setDefaultTradingAccount(otherAccount.id);
    }
  }

  const { error } = await supabase
    .from('trading_accounts')
    .delete()
    .eq('id', accountId);

  if (error) throw error;
}

// Add a new function to update a trading account
export async function updateTradingAccount(accountId: string, updates: { name?: string; description?: string; isDefault?: boolean }) {
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.isDefault !== undefined) {
    // If setting as default, first unset any existing default accounts for the CORRECT user
    if (updates.isDefault) {
      // Get the user_id associated with this accountId
      const { data: accountData, error: fetchError } = await supabase
        .from('trading_accounts')
        .select('user_id')
        .eq('id', accountId)
        .single();
        
      if (fetchError) throw new Error('Could not find account to update.');
      if (!accountData?.user_id) throw new Error('Account has no associated user.');
      
      // Unset default for the specific user owning the account
      await supabase
        .from('trading_accounts')
        .update({ is_default: false })
        .eq('user_id', accountData.user_id);
    }
    
    updateData.is_default = updates.isDefault;
  }
  
  updateData.updated_at = new Date();
  
  const { data, error } = await supabase
    .from('trading_accounts')
    .update(updateData)
    .eq('id', accountId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}