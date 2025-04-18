import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TradeHistoryTable from '../components/TradeHistoryTable';
import { Trade } from '../types';
import { getTrades, deleteTrade } from '../lib/api';
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare } from 'lucide-react';

// Copied from PerformanceOverview
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Copied from PerformanceOverview
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export default function Journal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showChat, setShowChat] = useState(false);
  const [selectedTradeForChat, setSelectedTradeForChat] = useState<Trade | null>(null);

  // Function to load ALL trades
  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tradeData = await getTrades();
      const formattedTrades = tradeData.map(trade => ({ ...trade, time: trade.entryTime }));
      setTrades(formattedTrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
      console.error("Failed to load trades:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter trades whenever the main list or filters change
  useEffect(() => {
    let filtered = [...trades];
    let yearToFilter: number | null = null;

    if (selectedYear && selectedYear !== "All Years") {
      yearToFilter = parseInt(selectedYear);
      filtered = filtered.filter(trade => new Date(trade.date).getFullYear() === yearToFilter);
    }

    if (selectedMonth && selectedMonth !== "All Trades" && yearToFilter !== null) {
      const monthIndex = months.indexOf(selectedMonth);
      filtered = filtered.filter(trade => new Date(trade.date).getMonth() === monthIndex);
    } else if (selectedMonth && selectedMonth !== "All Trades") {
        // If only month is selected (implicitly current year if year isn't set)
        yearToFilter = yearToFilter || new Date().getFullYear();
        const monthIndex = months.indexOf(selectedMonth);
        filtered = trades.filter(trade => {
            const tradeDate = new Date(trade.date);
            return tradeDate.getMonth() === monthIndex && tradeDate.getFullYear() === yearToFilter;
        });
    }

    setFilteredTrades(filtered);
  }, [trades, selectedMonth, selectedYear]);

  // Load initial trades on mount
  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Handler for deleting trades
  const handleDeleteTrades = async (tradeIds: string[]) => {
    try {
      await Promise.all(tradeIds.map(id => deleteTrade(id)));
      await loadTrades(); // Refresh main list
      if (selectedTradeForChat && tradeIds.includes(selectedTradeForChat.id)) {
        setSelectedTradeForChat(null); // Clear chat if the selected trade was deleted
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trades');
      console.error('Failed to delete trades:', err);
      await loadTrades(); // Refresh even on error
    }
  };

  // Updated handler for selecting a trade
  const handleSelectTrade = (trade: Trade) => {
    if (showChat) {
      setSelectedTradeForChat(trade); // Set trade for chat analysis
    } else {
      setSelectedTrade(trade); // Set trade for form editing
      setShowTradeForm(true);
    }
  };

  // Handler for closing the trade form modal
  const handleTradeFormClose = async () => {
    setShowTradeForm(false);
    setSelectedTrade(null);
    await loadTrades(); // Refresh main list
  };

  // Handler for closing the chat
  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedTradeForChat(null);
  };

  // Handlers for dropdown changes
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

  return (
    <main className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col flex-grow">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Trading Journal</h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              disabled={showChat}
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
              disabled={showChat}
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
              {showChat ? 'Close PIP' : 'Chat with PIP'}
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
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
          <button onClick={loadTrades} className="ml-4 px-2 py-1 bg-red-500 text-white rounded">Retry</button>
        </div>
      )}

      <div className={`flex-grow flex ${showChat ? 'gap-8' : ''}`}>
        <div className={`flex flex-col ${showChat ? 'w-1/2' : 'w-full'}`}>
          {loading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="flex-grow">
              {showChat && (
                 <p className="text-sm text-gray-500 mb-2">Click a trade in the table to analyze with PIP.</p>
              )}
              <TradeHistoryTable
                trades={filteredTrades}
                onSelectTrade={handleSelectTrade}
                onDeleteTrades={handleDeleteTrades}
                showChat={showChat}
              />
            </div>
          )}
        </div>

        {showChat && (
          <div className="w-1/2 flex flex-col">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Trade Analysis with PIP</h2>
            <TradeChatBox 
              trade={selectedTradeForChat}
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
    </main>
  );
} 