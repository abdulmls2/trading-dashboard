import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../components/Header';
import PerformanceMetricsComponent from '../components/PerformanceMetrics';
import TradeHistoryTable from '../components/TradeHistoryTable';
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare } from 'lucide-react';
import { Trade, PerformanceMetrics as Metrics } from '../types';
import { getTrades, getTradeViolations, getPerformanceMetrics, updatePerformanceMetrics } from '../lib/api';

// Default empty calculated metrics
const emptyCalculatedMetrics: Omit<Metrics, 'monthlyPipTarget' | 'capital'> & { totalPips: number; violatedTradesCount: number } = {
  totalTrades: 0,
  winRate: 0,
  averageRRR: 0,
  totalProfitLoss: 0,
  totalPips: 0,
  violationsCount: 0,
  violatedTradesCount: 0,
};

// Default empty DB metrics
const defaultDbMetrics: Partial<Metrics> = {
  monthlyPipTarget: 10, // Default value
  capital: 100, // Default value
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Function to get available years (current year and 5 years back)
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export default function Performance() {
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [violations, setViolations] = useState<any[]>([]);
  const [monthlyDbMetrics, setMonthlyDbMetrics] = useState<Metrics | null>(null); // State for DB-fetched metrics
  const [loadingMetrics, setLoadingMetrics] = useState(false); // Separate loading state for metrics

  // Calculate performance metrics based on filtered trades and violations
  const calculatedPerformanceMetrics = useMemo(() => {
    if (filteredTrades.length === 0) return emptyCalculatedMetrics;

    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(trade => trade.profitLoss > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalProfitLoss = filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const totalTrueReward = filteredTrades.reduce((sum, trade) => {
      const trueRewardValue = parseFloat(trade.trueReward || '0');
      return sum + (isNaN(trueRewardValue) ? 0 : trueRewardValue);
    }, 0);
    const totalPips = filteredTrades.reduce((sum, trade) => {
      const trueTpSlValue = parseFloat(trade.true_tp_sl || '0');
      return sum + (isNaN(trueTpSlValue) ? 0 : trueTpSlValue);
    }, 0);
    const violationsCount = violations.length;
    
    // Calculate the number of unique trades that have violations
    const tradeIdsWithViolations = new Set(violations.map(v => v.tradeId));
    const violatedTradesCount = tradeIdsWithViolations.size;
    
    return {
      totalTrades,
      winRate: Math.round(winRate),
      averageRRR: totalTrueReward,
      totalProfitLoss,
      totalPips,
      violationsCount,
      violatedTradesCount,
    };
  }, [filteredTrades, violations]);

  // Function to format date as YYYY-MM-01 for API calls
  const getMonthString = useCallback((year: number, monthName: string): string | null => {
    const monthIndex = months.indexOf(monthName);
    if (monthIndex === -1) return null; // Invalid month name
    // Ensure month is 2 digits (e.g., 01, 10)
    const monthString = (monthIndex + 1).toString().padStart(2, '0'); 
    return `${year}-${monthString}-01`;
  }, []);

  // Function to fetch metrics for a given month/year
  const fetchMonthlyMetrics = useCallback(async (year: number, monthName: string) => {
    const monthStr = getMonthString(year, monthName);
    if (!monthStr) {
      setMonthlyDbMetrics(null); // Reset if month/year is invalid or "All"
      return;
    }
    
    setLoadingMetrics(true);
    try {
      const data = await getPerformanceMetrics(monthStr);
      setMonthlyDbMetrics(data);
    } catch (err) {
      console.error("Failed to load monthly metrics:", err);
      setError(err instanceof Error ? err.message : 'Failed to load monthly metrics');
      setMonthlyDbMetrics(null); // Reset on error
    } finally {
      setLoadingMetrics(false);
    }
  }, [getMonthString]);

  // Filter trades whenever trades, selectedMonth, or selectedYear changes
  const filterTrades = useCallback(() => {
    let filtered = [...trades];
    let yearToFilter: number | null = null;
    let monthToFilter: string | null = null;

    if (selectedYear && selectedYear !== "All Years") {
      yearToFilter = parseInt(selectedYear);
      filtered = filtered.filter(trade => new Date(trade.date).getFullYear() === yearToFilter);
    }

    if (selectedMonth && selectedMonth !== "All Trades" && yearToFilter !== null) {
      monthToFilter = selectedMonth;
      const monthIndex = months.indexOf(selectedMonth);
      filtered = filtered.filter(trade => new Date(trade.date).getMonth() === monthIndex);
    } else if (selectedMonth && selectedMonth !== "All Trades") {
        // If only month is selected (implicitly current year)
        yearToFilter = new Date().getFullYear(); 
        monthToFilter = selectedMonth;
        const monthIndex = months.indexOf(selectedMonth);
        filtered = trades.filter(trade => {
            const tradeDate = new Date(trade.date);
            return tradeDate.getMonth() === monthIndex && tradeDate.getFullYear() === yearToFilter;
        });
    }

    setFilteredTrades(filtered);

    // Fetch metrics for the selected period if a specific month and year are chosen
    if (monthToFilter && yearToFilter) {
      fetchMonthlyMetrics(yearToFilter, monthToFilter);
    } else {
      setMonthlyDbMetrics(null); // Clear metrics if showing "All"
    }
  }, [trades, selectedMonth, selectedYear, fetchMonthlyMetrics]);

  // Initial data load for trades and violations
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [tradeData, violationData] = await Promise.all([
          getTrades(),
          getTradeViolations()
        ]);
        
        const formattedTrades = tradeData.map(trade => ({ ...trade, time: trade.entryTime }));
        setTrades(formattedTrades);
        setViolations(violationData);
        // Initial filter and metrics fetch will be triggered by the filterTrades effect
      } catch (err) { 
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []); // Runs only once on mount

  // Effect to run filtering and metric fetching when selections change
  useEffect(() => {
    if (trades.length > 0) {
      filterTrades();
    }
  }, [selectedMonth, selectedYear, trades, filterTrades]);

  // Handler to update monthly metrics in DB
  const handleUpdateMonthlyMetrics = useCallback(async (updates: Partial<Metrics>) => {
    const year = selectedYear === 'All Years' ? new Date().getFullYear() : parseInt(selectedYear);
    const monthName = selectedMonth === 'All Trades' ? months[new Date().getMonth()] : selectedMonth;
    const monthStr = getMonthString(year, monthName);

    if (!monthStr) {
      setError('Cannot update metrics without a selected month and year.');
      return;
    }

    try {
      const currentMetrics = monthlyDbMetrics || {}; // Use existing or empty object
      const updatedData = await updatePerformanceMetrics({
        ...currentMetrics, // Include existing fields 
        ...updates,      // Apply updates
        month: monthStr, // Ensure month is included
      });
      setMonthlyDbMetrics(updatedData); // Update local state with response
    } catch (err) {
      console.error("Failed to update monthly metrics:", err);
      setError(err instanceof Error ? err.message : 'Failed to update metrics');
    }
  }, [selectedYear, selectedMonth, monthlyDbMetrics, getMonthString]);

  // Update month selection handler
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    // filterTrades will be called by the useEffect dependency change
  };

  // Update year selection handler
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    // filterTrades will be called by the useEffect dependency change
  };

  const handleSelectTrade = (trade: Trade) => {
    if (showChat) {
      setSelectedTrade(trade);
    } else {
      setSelectedTrade(trade);
      setShowTradeForm(true);
    }
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedTrade(null);
  };

  const handleTradeFormClose = async () => {
    setShowTradeForm(false);
    setSelectedTrade(null);
    // Refresh trades and violations after form is closed
    try {
      setLoading(true); // Show loading indicator during refresh
      const [tradeData, violationData] = await Promise.all([
        getTrades(),
        getTradeViolations()
      ]);
      
      const formattedTrades = tradeData.map(trade => ({ ...trade, time: trade.entryTime }));
      setTrades(formattedTrades);
      setViolations(violationData);
      // Let the useEffect handle re-filtering and fetching metrics
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Performance Overview</h1>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              >
                <option value="All Years">All Years</option>
                {getAvailableYears().map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              >
                <option value="All Trades">All Trades</option>
                {months.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <button
                onClick={() => setShowChat(!showChat)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                {showChat ? 'Close Analysis' : 'Trade Analysis'}
              </button>
              <button
                onClick={() => {
                  setSelectedTrade(null);
                  setShowTradeForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Trade
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-8">
            <PerformanceMetricsComponent 
              metrics={calculatedPerformanceMetrics} 
              monthlyPipTarget={monthlyDbMetrics?.monthlyPipTarget ?? defaultDbMetrics.monthlyPipTarget}
              capital={monthlyDbMetrics?.capital ?? defaultDbMetrics.capital}
              violationsCount={calculatedPerformanceMetrics.violationsCount}
              violatedTradesCount={calculatedPerformanceMetrics.violatedTradesCount}
              onUpdateMetrics={handleUpdateMonthlyMetrics}
              isLoading={loadingMetrics} // Pass loading state
            />
            
            <div className={`grid ${showChat ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-8`}>
              <div className={showChat ? '' : 'w-full'}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Trade History</h2>
                  {showChat && (
                    <p className="text-sm text-gray-500">Click a trade to analyze it</p>
                  )}
                </div>
                {loading ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                    Loading trades...
                  </div>
                ) : (
                  <TradeHistoryTable 
                    trades={filteredTrades}
                    onSelectTrade={handleSelectTrade}
                  />
                )}
              </div>

              {showChat && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Trade Analysis</h2>
                  <TradeChatBox 
                    trade={selectedTrade}
                    onClose={handleCloseChat}
                  />
                </div>
              )}
            </div>
          </div>

          {showTradeForm && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedTrade ? 'Update Trade' : 'Log New Trade'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowTradeForm(false);
                        setSelectedTrade(null);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <TradeForm 
                    onClose={handleTradeFormClose}
                    existingTrade={selectedTrade || undefined} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}