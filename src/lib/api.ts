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

// --- localStorage Caching for Trades ---

interface CachedTradesData {
  trades: Trade[];
  totalCount: number;
  timestamp: number;
}

const CACHE_PREFIX = 'trades';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours for general cache validity

function getMonthName(monthIndex: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][monthIndex];
}

function getMonthIndex(monthName: string): number {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName);
}

// Helper function to format a Date object to 'YYYY-MM-DD' string
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateCacheKey(userId: string, accountId: string | null, year: string, month: string): string {
  const accountSuffix = accountId || 'all_accounts';
  return `${CACHE_PREFIX}-${userId}-${accountSuffix}-${year}-${month}`;
}

function getMonthlyCachedTrades(userId: string, accountId: string | null, year: string, month: string): CachedTradesData | null {
  if (typeof window === 'undefined') return null;

  const today = new Date();
  const currentCalendarYear = today.getFullYear().toString();
  const currentCalendarMonthName = getMonthName(today.getMonth());

  // Only retrieve from cache if the request is for the *actual current calendar month*
  if (year !== currentCalendarYear || month !== currentCalendarMonthName) {
    // console.log(`[Cache] Not attempting to get cache for ${year}-${month} as it's not the current calendar month (${currentCalendarYear}-${currentCalendarMonthName})`);
    return null;
  }

  const key = generateCacheKey(userId, accountId, year, month);
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed: CachedTradesData = JSON.parse(cached);
      // Basic expiry check, though main logic is to clear other months when a new one is set
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        console.log(`[Cache] HIT for ${key}`);
        return parsed;
      } else {
        console.log(`[Cache] EXPIRED for ${key}`);
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error(`[Cache] Error reading cache for ${key}:`, error);
    localStorage.removeItem(key); // Clear corrupted cache
  }
  console.log(`[Cache] MISS for ${key}`);
  return null;
}

function setMonthlyCachedTrades(userId: string, accountId: string | null, year: string, month: string, trades: Trade[], totalCount: number): void {
  if (typeof window === 'undefined') return;

  const today = new Date();
  const currentCalendarYear = today.getFullYear().toString();
  const currentCalendarMonthName = getMonthName(today.getMonth());

  // Only set cache if the data being saved is for the *actual current calendar month*
  if (year !== currentCalendarYear || month !== currentCalendarMonthName) {
    // console.log(`[Cache] Not setting cache for ${year}-${month} as it's not the current calendar month (${currentCalendarYear}-${currentCalendarMonthName})`);
    return;
  }

  const currentKey = generateCacheKey(userId, accountId, year, month);
  const dataToCache: CachedTradesData = { trades, totalCount, timestamp: Date.now() };

  try {
    // Clear other months' cache for the same user and account
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_PREFIX}-${userId}-${accountId || 'all_accounts'}-`) && key !== currentKey) {
        console.log(`[Cache] Clearing old month's cache: ${key} due to new cache for ${currentKey}`);
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(currentKey, JSON.stringify(dataToCache));
    console.log(`[Cache] SET for ${currentKey}`, { itemCount: trades.length, totalCount });
  } catch (error) {
    console.error(`[Cache] Error setting cache for ${currentKey}:`, error);
    // If quota is exceeded, we might need a more sophisticated cleanup
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn("[Cache] QuotaExceededError. Consider implementing a more robust cleanup strategy if this persists.");
        // Simple strategy: remove the oldest cache entry for this user to make space
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${CACHE_PREFIX}-${userId}-`)) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const parsedItem: CachedTradesData = JSON.parse(item);
                        if (parsedItem.timestamp < oldestTimestamp) {
                            oldestTimestamp = parsedItem.timestamp;
                            oldestKey = key;
                        }
                    }
                } catch (e) { /* ignore parse error for other items */ }
            }
        }
        if (oldestKey) {
            console.log(`[Cache] Quota exceeded, removing oldest cache item: ${oldestKey}`);
            localStorage.removeItem(oldestKey);
            // Try setting again
            try {
                localStorage.setItem(currentKey, JSON.stringify(dataToCache));
            } catch (retryError) {
                console.error(`[Cache] Error setting cache for ${currentKey} even after cleanup:`, retryError);
            }
        }
    }
  }
}

function clearMonthlyCache(userId: string, accountId: string | null, year: string, month: string): void {
  if (typeof window === 'undefined') return;

  const today = new Date();
  const currentCalendarYear = today.getFullYear().toString();
  const currentCalendarMonthName = getMonthName(today.getMonth());

  // Only clear cache if the request is for the *actual current calendar month*
  // This effectively means we are only ever clearing the current month's cache.
  if (year !== currentCalendarYear || month !== currentCalendarMonthName) {
    // console.log(`[Cache] Not attempting to clear cache for ${year}-${month} as it's not the current calendar month (${currentCalendarYear}-${currentCalendarMonthName})`);
    return;
  }

  const key = generateCacheKey(userId, accountId, year, month);
  try {
    localStorage.removeItem(key);
    console.log(`[Cache] CLEARED for ${key}`);
  } catch (error) {
    console.error(`[Cache] Error clearing cache for ${key}:`, error);
  }
}

export function clearCacheForMonthOnDeletion(userId: string, accountId: string | null, year: string, month: string): void {
    clearMonthlyCache(userId, accountId, year, month);
}

// --- End localStorage Caching ---

export async function createTrade(trade: Omit<Trade, 'id' | 'time' | 'top_bob_fv' | 'drawdown'> & { top_bob_fv?: string; drawdown?: number }, targetUserId?: string | null, accountId?: string | null) {
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
  
  // Use Record<string, any> to allow adding dynamic properties
  const tradeData: Record<string, any> = {
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
  };
  
  // Only add drawdown if it's defined
  if (trade.drawdown !== undefined) {
    tradeData.drawdown = trade.drawdown;
  }

  const { data, error } = await supabase
    .from('trades')
    .insert([tradeData])
    .select()
    .single();

  if (error) throw error;

  // Cache invalidation
  if (data && data.date) {
    const tradeDate = new Date(data.date);
    const tradeYear = tradeDate.getFullYear().toString();
    const tradeMonth = getMonthName(tradeDate.getMonth());
    const userIdToClear = targetUserId || (await supabase.auth.getUser()).data.user?.id;

    // Clear cache only if the modified trade falls into the *actual current calendar month*
    const today = new Date();
    const currentCalendarYear = today.getFullYear().toString();
    const currentCalendarMonthName = getMonthName(today.getMonth());

    if (userIdToClear && tradeYear === currentCalendarYear && tradeMonth === currentCalendarMonthName) {
        console.log(`[Cache Invalidation] createTrade: Trade modified in current month. Clearing ${tradeYear}-${tradeMonth} for user ${userIdToClear}, account ${data.account_id || 'all_accounts'}`);
        clearMonthlyCache(userIdToClear, data.account_id || null, tradeYear, tradeMonth);
    } else {
        console.log(`[Cache Invalidation] createTrade: Trade modified in ${tradeYear}-${tradeMonth}, not the current calendar month. Cache not affected.`);
    }
  }

  return data;
}

export async function updateTrade(id: string, trade: Partial<Omit<Trade, 'time'>>) {
  const updates: Record<string, any> = {};
  
  // Check each field and add to updates if it exists in the partial trade object
  if (trade.date !== undefined) updates.date = trade.date;
  if (trade.pair !== undefined) updates.pair = trade.pair;
  if (trade.action !== undefined) updates.action = trade.action;
  if (trade.entryTime !== undefined) updates.entry_time = trade.entryTime;
  if (trade.exitTime !== undefined) updates.exit_time = trade.exitTime === '' ? null : trade.exitTime;
  if (trade.lots !== undefined) updates.lots = trade.lots;
  if (trade.pipStopLoss !== undefined) updates.pip_stop_loss = trade.pipStopLoss;
  if (trade.pipTakeProfit !== undefined) updates.pip_take_profit = trade.pipTakeProfit;
  if (trade.profitLoss !== undefined) updates.profit_loss = trade.profitLoss;
  // Explicitly handle drawdown: set to value if defined, set to NULL if undefined
  if ('drawdown' in trade) {
    updates.drawdown = trade.drawdown === undefined ? null : trade.drawdown;
  }
  if (trade.pivots !== undefined) updates.pivots = trade.pivots;
  if (trade.bankingLevel !== undefined) updates.banking_level = trade.bankingLevel;
  if (trade.riskRatio !== undefined) updates.risk_ratio = trade.riskRatio;
  if (trade.comments !== undefined) updates.comments = trade.comments;
  if (trade.day !== undefined) updates.day = trade.day;
  if (trade.direction !== undefined) updates.direction = trade.direction;
  if (trade.orderType !== undefined) updates.order_type = trade.orderType;
  if (trade.marketCondition !== undefined) updates.market_condition = trade.marketCondition;
  if (trade.ma !== undefined) updates.ma = trade.ma;
  if (trade.fib !== undefined) updates.fib = trade.fib;
  if (trade.gap !== undefined) updates.gap = trade.gap;
  if (trade.mindset !== undefined) updates.mindset = trade.mindset;
  if (trade.tradeLink !== undefined) updates.trade_link = trade.tradeLink === '' ? null : trade.tradeLink;
  if (trade.trueReward !== undefined) updates.true_reward = trade.trueReward;
  if (trade.true_tp_sl !== undefined) updates.true_tp_sl = trade.true_tp_sl;
  if (trade.additional_confluences !== undefined) updates.additional_confluences = trade.additional_confluences;
  if (trade.top_bob_fv !== undefined) updates.top_bob_fv = trade.top_bob_fv;

  const { data, error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Cache invalidation
  if (data && data.date) {
    const tradeDate = new Date(data.date);
    const tradeYear = tradeDate.getFullYear().toString();
    const tradeMonth = getMonthName(tradeDate.getMonth());
    const userIdToClear = data.user_id; 

    const today = new Date();
    const currentCalendarYear = today.getFullYear().toString();
    const currentCalendarMonthName = getMonthName(today.getMonth());

    if (userIdToClear && tradeYear === currentCalendarYear && tradeMonth === currentCalendarMonthName) {
        console.log(`[Cache Invalidation] updateTrade: Trade modified in current month. Clearing ${tradeYear}-${tradeMonth} for user ${userIdToClear}, account ${data.account_id || 'all_accounts'}`);
        clearMonthlyCache(userIdToClear, data.account_id || null, tradeYear, tradeMonth);
    } else {
        console.log(`[Cache Invalidation] updateTrade: Trade modified in ${tradeYear}-${tradeMonth}, not the current calendar month. Cache not affected.`);
    }
  }

  return data;
}

export async function deleteTrade(id: string) {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getTrades(
  targetUserId?: string | null, 
  accountId?: string | null, 
  page: number = 1, 
  perPage: number = 10,
  month?: string | null,
  year?: string | null
) {
  let userId: string;
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[API GetTrades] User not authenticated");
      return { trades: [], totalCount: 0 }; // Return empty if not authenticated
    }
    userId = user.id;
  }

  // Determine if the request is for the *actual current calendar month*
  const today = new Date();
  const currentCalendarYear = today.getFullYear().toString();
  const currentCalendarMonthName = getMonthName(today.getMonth());
  
  const isRequestForCurrentCalendarMonth = year === currentCalendarYear && month === currentCalendarMonthName;

  // Only attempt to use cache if the request is for the current calendar month
  if (isRequestForCurrentCalendarMonth) {
    const cachedData = getMonthlyCachedTrades(userId, accountId || null, year as string, month as string);
    if (cachedData) {
      const from = (page - 1) * perPage;
      const to = from + perPage;
      const paginatedTrades = cachedData.trades.slice(from, to);
      console.log(`[API GetTrades] Cache HIT. User: ${userId}, Account: ${accountId}, Month: ${month}, Year: ${year}. Returning page ${page} from cache.`);
      return {
        trades: paginatedTrades,
        totalCount: cachedData.totalCount
      };
    }
  }

  // Cache miss or not cacheable (e.g., "All Trades"), proceed to fetch from Supabase
  console.log(`[API GetTrades] Cache MISS or not cacheable. User: ${userId}, Account: ${accountId}, Month: ${month}, Year: ${year}. Fetching from Supabase.`);

  // --- Database Fetch Logic ---
  // For count query, always apply filters
  let countQueryBuilder = supabase
    .from('trades')
    .select('id', { count: 'exact', head: true }) // Use head:true for count only
    .eq('user_id', userId);

  if (accountId) {
    countQueryBuilder = countQueryBuilder.eq('account_id', accountId);
  }

  let startDateStr: string | null = null;
  let endDateStr: string | null = null;

  if (month && month !== 'All Trades' && year && year !== 'All Years') {
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
      startDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), monthIndex, 1));
      endDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), monthIndex + 1, 0));
      countQueryBuilder = countQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
    }
  } else if (year && year !== 'All Years') {
    startDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), 0, 1));
    endDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), 11, 31));
    countQueryBuilder = countQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
  } else if (month && month !== 'All Trades') { // Month specified, but year is "All Years"
    const currentDbYear = new Date().getFullYear();
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
        startDateStr = formatDateToYYYYMMDD(new Date(currentDbYear, monthIndex, 1));
        endDateStr = formatDateToYYYYMMDD(new Date(currentDbYear, monthIndex + 1, 0));
        countQueryBuilder = countQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
    }
  }
  
  const { count, error: countError } = await countQueryBuilder;

  if (countError) {
    console.error("[API GetTrades] Error fetching count:", countError);
    throw countError;
  }
  const totalCount = count || 0;

  // For data query
  let dataQueryBuilder = supabase
    .from('trades')
    .select(`
      id, user_id, account_id, date, pair, action, entry_time, exit_time, lots, 
      pip_stop_loss, pip_take_profit, profit_loss, drawdown, pivots, banking_level, 
      risk_ratio, comments, day, direction, order_type, market_condition, ma, fib, 
      gap, mindset, trade_link, true_reward, true_tp_sl, additional_confluences, 
      top_bob_fv, created_at
    `)
    .eq('user_id', userId);

  if (accountId) {
    dataQueryBuilder = dataQueryBuilder.eq('account_id', accountId);
  }

  if (startDateStr && endDateStr) {
    dataQueryBuilder = dataQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
  }
  
  // If we are caching (specific month and year), fetch ALL trades for that month to populate cache,
  // then paginate locally. Otherwise, paginate at DB level.
  if (isRequestForCurrentCalendarMonth) {
    // Fetch all for the month for caching
    dataQueryBuilder = dataQueryBuilder.order('date', { ascending: false });
  } else {
    // Paginate at DB level if not caching this specific request
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    dataQueryBuilder = dataQueryBuilder.order('date', { ascending: false }).range(from, to);
  }

  const { data: dbTrades, error: dbError } = await dataQueryBuilder;

  if (dbError) {
    console.error("[API GetTrades] Error fetching trades:", dbError);
    throw dbError;
  }

  const allFetchedTrades = (dbTrades || []).map(trade => ({
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
    drawdown: trade.drawdown,
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
  })) as Trade[];

  // Only cache if the fetched data is for the *actual current calendar month*
  if (isRequestForCurrentCalendarMonth && year && month) { 
    setMonthlyCachedTrades(userId, accountId || null, year, month, allFetchedTrades, totalCount);
    
    const from = (page - 1) * perPage;
    const to = from + perPage;
    const paginatedTrades = allFetchedTrades.slice(from, to);
    
    console.log(`[API GetTrades] Fetched from DB, cached, and paginated locally. User: ${userId}, Account: ${accountId}, Month: ${month}, Year: ${year}. Page ${page}.`);
    return {
      trades: paginatedTrades,
      totalCount: totalCount // totalCount is for the filtered month
    };
  }

  // If not caching (e.g. "All Trades"), allFetchedTrades is already paginated by DB
  console.log(`[API GetTrades] Fetched from DB (no caching for this request type or already paginated by DB). User: ${userId}, Account: ${accountId}, Month: ${month}, Year: ${year}.`);
  return {
    trades: allFetchedTrades,
    totalCount: totalCount
  };
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
      drawdown,
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
    drawdown: trade.drawdown,
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

// Helper function to determine date range from month/year filters
const getGlobalDateRange = (month: string | 'all', year: string | 'all'): { startDate: string | null; endDate: string | null } => {
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (year !== 'all') {
    const numericYear = parseInt(year);
    if (month !== 'all') {
      let effectiveMonthIndex = -1;
      if (typeof month === 'string' && /^\\d+$/.test(month)) {
          const tempMonthIndex = parseInt(month, 10);
          if (tempMonthIndex >= 0 && tempMonthIndex <= 11) {
              effectiveMonthIndex = tempMonthIndex;
          }
      }
      if (effectiveMonthIndex === -1 && typeof month === 'string') { 
          effectiveMonthIndex = getMonthIndex(month);
      }

      if (effectiveMonthIndex !== -1) {
        startDate = formatDateToYYYYMMDD(new Date(numericYear, effectiveMonthIndex, 1));
        endDate = formatDateToYYYYMMDD(new Date(numericYear, effectiveMonthIndex + 1, 0));
      }
    } else {
      startDate = formatDateToYYYYMMDD(new Date(numericYear, 0, 1));
      endDate = formatDateToYYYYMMDD(new Date(numericYear, 11, 31));
    }
  } else if (month !== 'all') {
      startDate = null;
      endDate = null;
  }

  console.log(`[getGlobalDateRange] Month: ${month}, Year: ${year} -> Start: ${startDate}, End: ${endDate}`);
  return { startDate, endDate };
};


// --- Global Analysis API Functions ---

export async function getGlobalMarketConditionAnalysis(month: string | 'all', year: string | 'all') {
  const { startDate, endDate } = getGlobalDateRange(month, year);
  const { data, error } = await supabase.rpc('analyze_market_conditions_global', {
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.error('Error fetching global market condition analysis:', error);
    throw error;
  }
  console.log("[API] Global Market Condition Data:", data);
  return data || []; // Ensure return is always an array
}

export async function getGlobalDayOfWeekAnalysis(month: string | 'all', year: string | 'all') {
  const { startDate, endDate } = getGlobalDateRange(month, year);
  const { data, error } = await supabase.rpc('analyze_day_of_week_global', {
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.error('Error fetching global day of week analysis:', error);
    throw error;
  }
   console.log("[API] Global Day of Week Data:", data);
  return data || [];
}

export async function getGlobalTrendAnalysis(month: string | 'all', year: string | 'all') {
  const { startDate, endDate } = getGlobalDateRange(month, year);
  const { data, error } = await supabase.rpc('analyze_trend_global', {
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.error('Error fetching global trend analysis:', error);
    throw error;
  }
  console.log("[API] Global Trend Data:", data);
  return data || [];
}

export async function getGlobalConfluenceCountAnalysis(month: string | 'all', year: string | 'all') {
  const { startDate, endDate } = getGlobalDateRange(month, year);
  const { data, error } = await supabase.rpc('analyze_confluence_count_global', {
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) {
    console.error('Error fetching global confluence count analysis:', error);
    throw error;
  }
  console.log("[API] Global Confluence Count Data:", data);
  return data || [];
}

export async function getGlobalConfluenceGroupAnalysis(
  month: string | 'all',
  year: string | 'all',
  includeMarketCondition: boolean,
  selectedMarketCondition: string
) {
  const { startDate, endDate } = getGlobalDateRange(month, year);
  const { data, error } = await supabase.rpc('analyze_confluence_group_global', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_include_market_condition: includeMarketCondition,
    p_selected_market_condition: selectedMarketCondition === 'All' ? null : selectedMarketCondition
  });

  if (error) {
    console.error('Error fetching global confluence group analysis:', error);
    throw error;
  }
  console.log("[API] Global Confluence Group Data:", data);
  return data || [];
}

// --- End Global Analysis API Functions ---

export async function getPerformanceOverviewTrades(
  targetUserId?: string | null, 
  accountId?: string | null,
  month?: string | null,
  year?: string | null
) {
  let userId: string;
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[API getPerformanceOverviewTrades] User not authenticated");
      return { trades: [], totalCount: 0 }; // Return empty if not authenticated
    }
    userId = user.id;
  }
  
  // No caching for performance overview - we always fetch from database
  console.log(`[API getPerformanceOverviewTrades] Fetching for User: ${userId}, Account: ${accountId || 'all'}, Month: ${month || 'All'}, Year: ${year || 'All'}`);

  // For count query
  let countQueryBuilder = supabase
    .from('trades')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (accountId) {
    countQueryBuilder = countQueryBuilder.eq('account_id', accountId);
  }
  
  // Apply date filters if month and year are specified
  let startDateStr: string | null = null;
  let endDateStr: string | null = null;

  if (month && month !== 'All Trades' && year && year !== 'All Years') {
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
      startDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), monthIndex, 1));
      endDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), monthIndex + 1, 0));
      countQueryBuilder = countQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
    }
  } else if (year && year !== 'All Years') {
    startDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), 0, 1));
    endDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), 11, 31));
    countQueryBuilder = countQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
  } else if (month && month !== 'All Trades') { // Month specified, but year is "All Years"
    const currentDbYear = new Date().getFullYear();
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
        startDateStr = formatDateToYYYYMMDD(new Date(currentDbYear, monthIndex, 1));
        endDateStr = formatDateToYYYYMMDD(new Date(currentDbYear, monthIndex + 1, 0));
        countQueryBuilder = countQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
    }
  }
  
  const { count, error: countError } = await countQueryBuilder;

  if (countError) {
    console.error("[API getPerformanceOverviewTrades] Error fetching count:", countError);
    throw countError;
  }
  const totalCount = count || 0;

  // For data query - select only the ABSOLUTELY NECESSARY fields for performance overview
  // Based on actual usage in components:
  // - id (required for unique identification)
  // - user_id, account_id (required for data integrity)
  // - date (for filtering and all charts)
  // - entry_time (for time-based filtering and TradeTimeHeatmap)
  // - pair (for PairDistributionChart)
  // - profit_loss (for profit calculation and win rate)
  // - true_reward (for RRR calculation)
  // - true_tp_sl (for pips calculation and TradeTimeHeatmap)
  let dataQueryBuilder = supabase
    .from('trades')
    .select(`
      id, user_id, account_id, date, pair, entry_time,
      profit_loss, true_reward, true_tp_sl
    `)
    .eq('user_id', userId);

  if (accountId) {
    dataQueryBuilder = dataQueryBuilder.eq('account_id', accountId);
  }
  
  // Apply the same date filters to the data query
  if (startDateStr && endDateStr) {
    dataQueryBuilder = dataQueryBuilder.gte('date', startDateStr).lte('date', endDateStr);
  }
  
  // Order by date (most recent first) but don't paginate - get all for performance calcs
  dataQueryBuilder = dataQueryBuilder.order('date', { ascending: false });

  const { data: dbTrades, error: dbError } = await dataQueryBuilder;

  if (dbError) {
    console.error("[API getPerformanceOverviewTrades] Error fetching trades:", dbError);
    throw dbError;
  }

  // Map the DB fields to only the fields needed for Performance Overview
  // This creates a minimal subset of the Trade interface with only fields used by the charts
  const allFetchedTrades = (dbTrades || []).map(trade => ({
    id: trade.id,
    userId: trade.user_id,
    accountId: trade.account_id,
    date: trade.date,
    pair: trade.pair || '',
    entryTime: trade.entry_time || '',
    time: trade.entry_time || '', // Used for time-based charts
    profitLoss: trade.profit_loss || 0,
    trueReward: trade.true_reward || '0',
    true_tp_sl: trade.true_tp_sl || '0'
  }));

  console.log(`[API getPerformanceOverviewTrades] Fetched ${allFetchedTrades.length} trades from DB with minimal fields${startDateStr ? ` for period ${startDateStr} to ${endDateStr}` : ''}`);
  return {
    trades: allFetchedTrades,
    totalCount: totalCount
  };
}

// Function specifically for the Calendar page that fetches minimal trade data
export async function getCalendarTrades(
  targetUserId?: string | null, 
  accountId?: string | null,
  month?: number,
  year?: number
) {
  let userId: string;
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[API getCalendarTrades] User not authenticated");
      return []; // Return empty if not authenticated
    }
    userId = user.id;
  }
  
  // Default to current month if not specified
  const currentDate = new Date();
  const targetMonth = month !== undefined ? month : currentDate.getMonth();
  const targetYear = year !== undefined ? year : currentDate.getFullYear();
  
  // Calculate start and end dates for the month
  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0); // Last day of the month
  
  // Format dates for the query
  const startDateStr = formatDateToYYYYMMDD(startDate); 
  const endDateStr = formatDateToYYYYMMDD(endDate);
  
  console.log(`[API getCalendarTrades] Fetching minimal trade data for User: ${userId}, Account: ${accountId || 'all'}, Month: ${targetMonth + 1}/${targetYear}, Start: ${startDateStr}, End: ${endDateStr}`);

  // Create optimized query with only the fields needed for calendar
  let queryBuilder = supabase
    .from('trades')
    .select(`
      id, date, pair, action, entry_time, profit_loss
    `)
    .eq('user_id', userId)
    .gte('date', startDateStr) // Filter to start date of month
    .lte('date', endDateStr) // Filter to end date of month
    .order('date', { ascending: false });

  if (accountId) {
    queryBuilder = queryBuilder.eq('account_id', accountId);
  }

  const { data: dbTrades, error } = await queryBuilder;

  if (error) {
    console.error("[API getCalendarTrades] Error fetching trades:", error);
    throw error;
  }

  // Map only the minimum required fields
  const calendarTrades = (dbTrades || []).map(trade => ({
    id: trade.id,
    date: trade.date,
    pair: trade.pair || '',
    action: trade.action || '',
    entryTime: trade.entry_time || '',
    profitLoss: trade.profit_loss || 0,
    time: trade.entry_time || '' // Adding time field that copies entryTime for compatibility
  }));

  console.log(`[API getCalendarTrades] Fetched ${calendarTrades.length} trades with minimal fields for ${targetMonth + 1}/${targetYear}`);
  return calendarTrades;
}

// Fetch minimal trade data for analysis with server-side filtering
export async function getTradesForAnalysis(
  targetUserId?: string | null,
  accountId?: string | null,
  month?: string | null,
  year?: string | null
) {
  let userId: string;
  if (targetUserId) {
    userId = targetUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[API getTradesForAnalysis] User not authenticated");
      return [];
    }
    userId = user.id;
  }

  // Build date range for filtering
  let startDateStr: string | null = null;
  let endDateStr: string | null = null;
  if (month && month !== 'All Trades' && year && year !== 'All Years') {
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
      startDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), monthIndex, 1));
      endDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), monthIndex + 1, 0));
    }
  } else if (year && year !== 'All Years') {
    startDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), 0, 1));
    endDateStr = formatDateToYYYYMMDD(new Date(parseInt(year), 11, 31));
  } else if (month && month !== 'All Trades') {
    const currentDbYear = new Date().getFullYear();
    const monthIndex = getMonthIndex(month);
    if (monthIndex !== -1) {
      startDateStr = formatDateToYYYYMMDD(new Date(currentDbYear, monthIndex, 1));
      endDateStr = formatDateToYYYYMMDD(new Date(currentDbYear, monthIndex + 1, 0));
    }
  }

  let query = supabase
    .from('trades')
    .select(`
      id, user_id, account_id, date, pair, action, entry_time, exit_time, lots, pip_stop_loss, pip_take_profit, profit_loss, pivots, banking_level, ma, fib, top_bob_fv, day, direction, order_type, market_condition
    `)
    .eq('user_id', userId);

  if (accountId) {
    query = query.eq('account_id', accountId);
  }
  if (startDateStr && endDateStr) {
    query = query.gte('date', startDateStr).lte('date', endDateStr);
  }

  query = query.order('date', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('[API getTradesForAnalysis] Error fetching trades:', error);
    throw error;
  }
  if (!data) return [];

  // Map to only the fields needed for TradesAnalysis
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
    ma: trade.ma,
    fib: trade.fib,
    top_bob_fv: trade.top_bob_fv,
    day: trade.day,
    direction: trade.direction,
    orderType: trade.order_type,
    marketCondition: trade.market_condition,
    // Add time for compatibility
    time: trade.entry_time || ''
  }));
}