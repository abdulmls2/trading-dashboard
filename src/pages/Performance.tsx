import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import PerformanceMetrics from '../components/PerformanceMetrics';
import TradeHistoryTable from '../components/TradeHistoryTable';
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare } from 'lucide-react';
import { Trade, PerformanceMetrics as Metrics } from '../types';
import { getTrades } from '../lib/api';

// Default empty metrics
const emptyMetrics: Metrics & { totalPips: number } = {
  totalTrades: 0,
  winRate: 0,
  averageRRR: 0,
  totalProfitLoss: 0,
  totalPips: 0,
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

  // Calculate performance metrics based on filtered trades
  const performanceMetrics = useMemo(() => {
    if (filteredTrades.length === 0) return emptyMetrics;

    const totalTrades = filteredTrades.length;
    
    // Count winning trades (trades with positive P/L)
    const winningTrades = filteredTrades.filter(trade => trade.profitLoss > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    // Calculate total P/L
    const totalProfitLoss = filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
    
    // Calculate sum of trueReward values (no longer calculating average)
    const totalTrueReward = filteredTrades.reduce((sum, trade) => {
      // Parse trueReward as a number, default to 0 if not a valid number
      const trueRewardValue = parseFloat(trade.trueReward || '0');
      return sum + (isNaN(trueRewardValue) ? 0 : trueRewardValue);
    }, 0);
    
    // Calculate total pips using true_tp_sl
    const totalPips = filteredTrades.reduce((sum, trade) => {
      // Parse true_tp_sl as a number, default to 0 if not a valid number
      const trueTpSlValue = parseFloat(trade.true_tp_sl || '0');
      return sum + (isNaN(trueTpSlValue) ? 0 : trueTpSlValue);
    }, 0);
    
    return {
      totalTrades,
      winRate: Math.round(winRate), // Round to whole percentage
      averageRRR: totalTrueReward, // Now storing the sum rather than the average
      totalProfitLoss,
      totalPips,
    };
  }, [filteredTrades]);

  // Function to filter trades by selected month
  const filterTradesByMonth = (month: string) => {
    if (month === "All Trades") {
      setFilteredTrades(trades); // Show all trades
      return;
    }
    
    if (!month) {
      setFilteredTrades(trades); // Reset to all trades if no month is selected
      return;
    }
    
    const monthIndex = months.indexOf(month);
    const filtered = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return tradeDate.getMonth() === monthIndex && tradeDate.getFullYear() === new Date().getFullYear();
    });
    
    setFilteredTrades(filtered);
  };

  // Function to filter trades by selected month and year
  const filterTrades = () => {
    if (selectedMonth === "All Trades" && (!selectedYear || selectedYear === "All Years")) {
      setFilteredTrades(trades); // Show all trades
      return;
    }
    
    let filtered = [...trades];
    
    // Filter by year if selected
    if (selectedYear && selectedYear !== "All Years") {
      const year = parseInt(selectedYear);
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.date);
        return tradeDate.getFullYear() === year;
      });
    }
    
    // Further filter by month if selected
    if (selectedMonth && selectedMonth !== "All Trades") {
      const monthIndex = months.indexOf(selectedMonth);
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.date);
        return tradeDate.getMonth() === monthIndex;
      });
    }
    
    setFilteredTrades(filtered);
  };

  // Update the useEffect to set filtered trades initially
  useEffect(() => {
    async function loadTrades() {
      try {
        setLoading(true);
        const data = await getTrades();
        
        // Format the trades properly
        const formattedTrades = data.map(trade => ({
          ...trade,
          time: trade.entryTime, // Add the missing 'time' property required by Trade interface
        }));
        
        setTrades(formattedTrades);
        setFilteredTrades(formattedTrades); // Set initial filtered trades
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, []);

  // Update the month selection handler
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedMonth(selected);
    filterTrades();
  };

  // Add year selection handler
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedYear(selected);
    filterTrades();
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
    // Refresh trades after form is closed
    try {
      const data = await getTrades();
      
      // Format the trades properly
      const formattedTrades = data.map(trade => ({
        ...trade,
        time: trade.entryTime, // Add the missing 'time' property required by Trade interface
      }));
      
      setTrades(formattedTrades);
      // Re-apply any month filtering that was active
      if (selectedMonth) {
        filterTrades();
      } else {
        setFilteredTrades(formattedTrades);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh trades');
    }
  };

  // Update useEffect for filterTrades when dependencies change
  useEffect(() => {
    if (trades.length > 0) {
      filterTrades();
    }
  }, [selectedMonth, selectedYear, trades]);

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
            <PerformanceMetrics metrics={performanceMetrics} />
            
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