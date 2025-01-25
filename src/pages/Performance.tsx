import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PerformanceMetrics from '../components/PerformanceMetrics';
import TradeHistoryTable from '../components/TradeHistoryTable';
import TradeForm from '../components/TradeForm';
import TradeChatBox from '../components/TradeChatBox';
import { PlusCircle, MessageSquare } from 'lucide-react';
import { Trade } from '../types';
import { getTrades } from '../lib/api';

// Mock metrics for now
const mockMetrics = {
  totalTrades: 150,
  winRate: 65,
  averageRRR: 1.8,
  totalProfitLoss: 2547.89,
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Performance() {
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTrades() {
      try {
        setLoading(true);
        const data = await getTrades();
        setTrades(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, []);

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
      setTrades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh trades');
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
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              >
                <option value="">Select Month</option>
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
            <PerformanceMetrics metrics={mockMetrics} />
            
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
                    trades={trades} 
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