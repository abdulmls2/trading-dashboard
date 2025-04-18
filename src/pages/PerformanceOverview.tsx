import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import Header from '../components/Header'; // Ensure this line is removed or commented out
import PerformanceMetricsComponent from '../components/PerformanceMetrics';
// import TradeHistoryTable from '../components/TradeHistoryTable'; // Removed import
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare, LineChart, BarChart, PieChart } from 'lucide-react';
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

export default function UserPerformanceView() { // Renamed component
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
    const losingTrades = filteredTrades.filter(trade => trade.profitLoss < 0).length;
    const breakEvenTrades = filteredTrades.filter(trade => trade.profitLoss === 0).length;
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
    setSelectedTrade(trade);
    setShowChat(true);
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
              // onClick={() => setShowChat(!showChat)} // Disabled onClick
              onClick={() => {}} // Set onClick to do nothing
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-not-allowed opacity-60" // Added disabled styles
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              {showChat ? 'Close PIP' : 'Chat with PIP'}
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
          
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Charts</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Line Chart Placeholder */}
              <div 
                className="bg-white p-6 rounded-lg shadow relative overflow-hidden group cursor-help"
                title="Coming soon"
              >
                <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10">
                  <p className="text-lg font-medium text-gray-800">Coming soon</p>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance</h3>
                <div className="flex items-center justify-center h-60 relative">
                  <LineChart className="w-10 h-10 text-indigo-500 absolute" />
                  <div className="w-full h-full opacity-50">
                    <div className="h-40 w-full flex items-end">
                      <div className="h-20 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-28 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-16 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-32 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-24 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-36 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-20 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-28 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-12 w-1/12 bg-blue-500 mx-1"></div>
                      <div className="h-24 w-1/12 bg-blue-500 mx-1"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Pie Chart Placeholder */}
              <div 
                className="bg-white p-6 rounded-lg shadow relative overflow-hidden group cursor-help"
                title="Coming soon"
              >
                <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10">
                  <p className="text-lg font-medium text-gray-800">Coming soon</p>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Win/Loss Distribution</h3>
                <div className="flex items-center justify-center h-60 relative">
                  <PieChart className="w-10 h-10 text-indigo-500 absolute" />
                  <div className="w-40 h-40 rounded-full bg-gradient-to-r from-green-500 to-blue-500 opacity-50"></div>
                </div>
              </div>
              
              {/* Bar Chart Placeholder */}
              <div 
                className="bg-white p-6 rounded-lg shadow relative overflow-hidden group cursor-help"
                title="Coming soon"
              >
                <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10">
                  <p className="text-lg font-medium text-gray-800">Coming soon</p>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trade Volume by Pair</h3>
                <div className="flex items-center justify-center h-60 relative">
                  <BarChart className="w-10 h-10 text-indigo-500 absolute" />
                  <div className="w-full h-full opacity-50">
                    <div className="h-40 w-full flex items-end justify-around">
                      <div className="h-32 w-12 bg-indigo-500"></div>
                      <div className="h-20 w-12 bg-indigo-500"></div>
                      <div className="h-36 w-12 bg-indigo-500"></div>
                      <div className="h-16 w-12 bg-indigo-500"></div>
                      <div className="h-24 w-12 bg-indigo-500"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Heat Map Placeholder */}
              <div 
                className="bg-white p-6 rounded-lg shadow relative overflow-hidden group cursor-help"
                title="Coming soon"
              >
                <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-10">
                  <p className="text-lg font-medium text-gray-800">Coming soon</p>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trade Time Map</h3>
                <div className="flex items-center justify-center h-60 relative">
                  <div className="w-full h-full grid grid-cols-7 grid-rows-5 gap-2 opacity-50">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`rounded bg-indigo-${Math.floor(Math.random() * 5) * 100 + 300}`}
                        style={{ opacity: Math.random() * 0.7 + 0.3 }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat box section */}
          {showChat && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Trade Analysis</h2>
              <TradeChatBox 
                trade={selectedTrade}
                onClose={handleCloseChat}
              />
            </div>
          )}
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
  );
} 