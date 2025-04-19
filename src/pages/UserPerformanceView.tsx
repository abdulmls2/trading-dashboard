import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PerformanceMetricsComponent from '../components/PerformanceMetrics';
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare, LineChart, BarChart, PieChart, ArrowLeft } from 'lucide-react';
import { Trade, PerformanceMetrics as Metrics } from '../types';
import { getTrades, getTradeViolations, getPerformanceMetrics, updatePerformanceMetrics } from '../lib/api';

// Props interface for the component
interface UserPerformanceViewProps {
  userId: string;
  userName: string;
  onExit: () => void;
  isAdminView?: boolean; // Flag to differentiate between admin and user view
}

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

export default function UserPerformanceView({
  userId,
  userName,
  onExit,
  isAdminView = false // Default isAdminView to false
}: UserPerformanceViewProps) {
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
    
    // Calculate violations count based on fetched violations for the user/period
    const filteredViolations = violations.filter(violation => {
      const trade = filteredTrades.find(t => t.id === violation.tradeId);
      return !!trade; // Check if the violated trade is within the filtered period
    });
    const violationsCount = filteredViolations.length;
    const tradeIdsWithViolations = new Set(filteredViolations.map(v => v.tradeId));
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
        // Found a win or break-even, reset the counter
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
      violationsCount, // Use filtered violations count
      violatedTradesCount, // Use filtered violations count
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

  // Function to fetch metrics for a given month/year, using the userId prop
  const fetchMonthlyMetrics = useCallback(async (year: number, monthName: string) => {
    const monthStr = getMonthString(year, monthName);
    if (!monthStr) {
      setMonthlyDbMetrics(null); // Reset if month/year is invalid or "All"
      return;
    }

    setLoadingMetrics(true);
    try {
      // Pass userId to getPerformanceMetrics
      const data = await getPerformanceMetrics(monthStr, userId);
      setMonthlyDbMetrics(data);
    } catch (err) {
      console.error("Failed to load monthly metrics:", err);
      setError(err instanceof Error ? err.message : 'Failed to load monthly metrics');
      setMonthlyDbMetrics(null); // Reset on error
    } finally {
      setLoadingMetrics(false);
    }
  }, [getMonthString, userId]); // Add userId to dependency array

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

  // Initial data load for trades and violations, using the userId prop
  const loadInitialData = useCallback(async () => {
    if (!userId) return; // Don't load if no user ID
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      // Pass userId to getTrades and getTradeViolations
      const [tradeData, violationData] = await Promise.all([
        getTrades(userId),
        getTradeViolations(userId) // Fetch violations for the specific user
      ]);

      const formattedTrades = tradeData.map(trade => ({ ...trade, time: trade.entryTime }));
      setTrades(formattedTrades);
      setViolations(violationData); // Store user-specific violations
      // Initial filter and metrics fetch will be triggered by the filterTrades effect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error("Error loading initial data:", err);
      setTrades([]); // Clear trades on error
      setViolations([]); // Clear violations on error
    } finally {
      setLoading(false);
    }
  }, [userId]); // Depend on userId

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]); // Run loadInitialData when it changes (due to userId change)

  // Effect to run filtering and metric fetching when selections change
  useEffect(() => {
    // No need to check trades.length here, filterTrades handles empty array
    filterTrades();
  }, [selectedMonth, selectedYear, trades, filterTrades]); // Run filter when selections or trades change

  // Handler to update monthly metrics in DB, passing the userId prop
  const handleUpdateMonthlyMetrics = useCallback(async (updates: Partial<Metrics>) => {
    if (isAdminView) return; // Admin cannot update metrics from this view

    const year = selectedYear === 'All Years' ? new Date().getFullYear() : parseInt(selectedYear);
    const monthName = selectedMonth === 'All Trades' ? months[new Date().getMonth()] : selectedMonth;
    const monthStr = getMonthString(year, monthName);

    if (!monthStr) {
      setError('Cannot update metrics without a selected month and year.');
      return;
    }

    try {
      const currentMetrics = monthlyDbMetrics || {}; // Use existing or empty object
      // Pass userId to updatePerformanceMetrics
      const updatedData = await updatePerformanceMetrics({
        ...currentMetrics, // Include existing fields
        ...updates,      // Apply updates
        month: monthStr, // Ensure month is included
      }, userId); // Pass userId here
      setMonthlyDbMetrics(updatedData); // Update local state with response
    } catch (err) {
      console.error("Failed to update monthly metrics:", err);
      setError(err instanceof Error ? err.message : 'Failed to update metrics');
    }
  }, [selectedYear, selectedMonth, monthlyDbMetrics, getMonthString, userId, isAdminView]); // Add userId and isAdminView to dependency array

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
    if (isAdminView) return; // Admin cannot interact with chat/form from this view

    setSelectedTrade(trade);
    // Decide whether to show chat or form based on current state
    if (showChat) {
      // Already showing chat, just update selected trade
    } else {
      setShowTradeForm(true); // Default to showing form if chat isn't open
    }
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedTrade(null);
  };

  const handleDeleteTrades = async (tradeIds: string[]) => {
    // After trades are deleted, refresh the data
    // Note: Actual deletion logic should be implemented if needed here or passed down
    // For now, just reload data
    loadInitialData();
  };

  const handleTradeFormClose = async () => {
    setShowTradeForm(false);
    setSelectedTrade(null);

    // Refresh trades data after form close
    loadInitialData();
  };

  const pageTitle = isAdminView ? `Performance Overview for ${userName}` : 'Performance Overview';

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            {isAdminView && (
              <button
                onClick={onExit}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
          </div>

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
              onClick={() => isAdminView ? {} : setShowChat(!showChat)} // Allow toggle only if not admin view
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isAdminView ? 'cursor-not-allowed opacity-60' : ''}`}
              disabled={isAdminView} // Disable button in admin view
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              {showChat ? 'Close PIP' : 'Chat with PIP'}
            </button>
            {!isAdminView && ( // Only show Add Trade button if not admin view
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
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
           <div className="flex justify-center items-center py-10">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
           </div>
        ) : (
          <div className="space-y-8">
            <PerformanceMetricsComponent
              metrics={calculatedPerformanceMetrics}
              monthlyPipTarget={monthlyDbMetrics?.monthlyPipTarget ?? defaultDbMetrics.monthlyPipTarget}
              capital={monthlyDbMetrics?.capital ?? defaultDbMetrics.capital}
              violationsCount={calculatedPerformanceMetrics.violationsCount}
              violatedTradesCount={calculatedPerformanceMetrics.violatedTradesCount}
              onUpdateMetrics={handleUpdateMonthlyMetrics}
              isLoading={loadingMetrics} // Pass loading state
              readOnly={isAdminView} // Pass readOnly based on isAdminView
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

            {/* Chat box section - only render if showChat is true and not admin view */}
            {showChat && !isAdminView && (
              <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Trade Analysis</h2>
                <TradeChatBox
                  trade={selectedTrade}
                  onClose={handleCloseChat}
                />
              </div>
            )}
          </div>
        )}

        {/* Trade Form Modal - only render if showTradeForm is true and not admin view */}
        {showTradeForm && !isAdminView && (
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