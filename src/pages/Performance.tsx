import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PerformanceMetricsComponent from '../components/PerformanceMetrics';
import TradeHistoryTable from '../components/TradeHistoryTable';
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare, ChevronDown, Filter, Calendar, Clock } from 'lucide-react';
import { Trade, PerformanceMetrics as Metrics } from '../types';
import { getTrades, getTradeViolations, getPerformanceMetrics, updatePerformanceMetrics } from '../lib/api';

// Default empty calculated metrics
const emptyCalculatedMetrics = {
  totalTrades: 0,
  winRate: 0,
  averageRRR: 0,
  totalProfitLoss: 0,
  totalPips: 0,
  violationsCount: 0,
  violatedTradesCount: 0,
  maxConsecutiveLosses: 0,
  winningTrades: 0,
  losingTrades: 0,
  breakEvenTrades: 0,
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

// Helper function to get saved currency from localStorage
const getSavedCurrency = () => {
  try {
    const saved = localStorage.getItem('userCurrency');
    return saved || '$'; // Default to $ if not found
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return '$'; // Fallback to $ on error
  }
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
  const [selectedCurrency, setSelectedCurrency] = useState(getSavedCurrency());

  // Calculate performance metrics based on filtered trades and violations
  const calculatedPerformanceMetrics = useMemo(() => {
    if (filteredTrades.length === 0) return emptyCalculatedMetrics;

    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(trade => trade.profitLoss > 0).length;
    const losingTrades = filteredTrades.filter(trade => trade.profitLoss < 0).length;
    const breakEvenTrades = filteredTrades.filter(trade => trade.profitLoss === 0).length;
    const nonBreakEvenTrades = totalTrades - breakEvenTrades;
    const winRate = nonBreakEvenTrades > 0 ? (winningTrades / nonBreakEvenTrades) * 100 : 0;
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
    
    // Calculate maximum consecutive losses
    let maxConsecutiveLosses = 0;
    let currentConsecutiveLosses = 0;
    
    // Sort trades by date in ascending order (oldest first)
    const sortedTrades = [...filteredTrades].sort((a, b) => 
      new Date(a.date + ' ' + a.entryTime).getTime() - new Date(b.date + ' ' + b.entryTime).getTime()
    );
    
    // Count consecutive losses
    for (let i = 0; i < sortedTrades.length; i++) {
      if (sortedTrades[i].profitLoss < 0) {  // Check if it's a loss (profitLoss < 0)
        currentConsecutiveLosses++;
      } else {
        // Found a win, reset the counter
        currentConsecutiveLosses = 0;
      }
      
      // Update max if current streak is longer
      if (currentConsecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentConsecutiveLosses;
      }
    }
    
    return {
      totalTrades,
      winRate: Math.round(winRate),
      averageRRR: totalTrueReward,
      totalProfitLoss,
      totalPips,
      violationsCount,
      violatedTradesCount,
      maxConsecutiveLosses,
      winningTrades,
      losingTrades,
      breakEvenTrades,
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
  const loadInitialData = async () => {
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
  };

  useEffect(() => {
    loadInitialData();
    // Update currency if it changes in another tab/window
    const handleStorageChange = () => {
      setSelectedCurrency(getSavedCurrency());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

  const handleDeleteTrades = async (tradeIds: string[]) => {
    // After trades are deleted, refresh the data
    loadInitialData();
  };

  const handleTradeFormClose = async () => {
    setShowTradeForm(false);
    setSelectedTrade(null);
    
    // Refresh trades data after form close
    loadInitialData();
  };

  return (
    <main className="w-full px-6 py-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Page Header with modern styling */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                {selectedMonth !== "All Trades" ? selectedMonth : ""} {selectedYear !== "All Years" ? selectedYear : "All time"} trading performance
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
              {/* Time period filter */}
              <div className="flex items-center space-x-2">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                  <select
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="pl-10 block w-full rounded-md border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white py-2 pr-10"
                  >
                    <option value="All Years">All Years</option>
                    {getAvailableYears().map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
                
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                  <select
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="pl-10 block w-full rounded-md border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white py-2 pr-10"
                  >
                    <option value="All Trades">All Months</option>
                    {months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <button
                onClick={() => setShowChat(!showChat)}
                className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <MessageSquare className="h-4 w-4 mr-2 text-gray-500" />
                {showChat ? 'Close PIP' : 'Chat with PIP'}
              </button>
              
              <button
                onClick={() => {
                  setSelectedTrade(null);
                  setShowTradeForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Trade
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="mb-8">
          <PerformanceMetricsComponent 
            metrics={calculatedPerformanceMetrics} 
            monthlyPipTarget={monthlyDbMetrics?.monthlyPipTarget ?? defaultDbMetrics.monthlyPipTarget}
            capital={monthlyDbMetrics?.capital ?? defaultDbMetrics.capital}
            violationsCount={calculatedPerformanceMetrics.violationsCount}
            violatedTradesCount={calculatedPerformanceMetrics.violatedTradesCount}
            onUpdateMetrics={handleUpdateMonthlyMetrics}
            isLoading={loadingMetrics}
          />
        </div>
        
        {/* Trade History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trade History Table */}
          <div className={`${showChat ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Trade History</h2>
                <div className="flex items-center">
                  {showChat && (
                    <p className="text-sm text-gray-500 mr-4">Click a trade to analyze it</p>
                  )}
                  <button className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filter trades</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="animate-pulse flex justify-center">
                    <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                  </div>
                  <p className="mt-2">Loading trades...</p>
                </div>
              ) : (
                <TradeHistoryTable 
                  trades={filteredTrades}
                  onSelectTrade={handleSelectTrade}
                  onDeleteTrades={handleDeleteTrades}
                  showChat={showChat}
                  selectedCurrency={selectedCurrency}
                />
              )}
            </div>
          </div>

          {/* Trade Analysis Chat */}
          {showChat && (
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">Trade Analysis</h2>
              </div>
              <div className="p-0">
                <TradeChatBox 
                  trade={selectedTrade}
                  onClose={handleCloseChat}
                />
              </div>
            </div>
          )}
        </div>

        {/* Trade Form Modal */}
        {showTradeForm && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
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
  );
}