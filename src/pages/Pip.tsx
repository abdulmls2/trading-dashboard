import React, { useState, useEffect } from 'react';
import TradeChatBox from '../components/TradeChatBox';
import { Trade } from '../types';
import { getTrades } from '../lib/api';
import { Search, Clock, TrendingUp, Filter, X, RefreshCw } from 'lucide-react';

export default function Pip() {
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showTradeSearch, setShowTradeSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'recent' | 'profitable' | 'all'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); // Show 15 trades per page
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0); // Key to force TradeChatBox remount

  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true);
        const data = await getTrades();
        const formattedTrades = data.map(trade => ({ ...trade, time: trade.entryTime }));
        setAllTrades(formattedTrades);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trades');
        console.error("Failed to load trades:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrades();
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleTradeSelect = (trade: Trade) => {
    setSelectedTrade(trade);
    setSearchTerm('');
  };

  const clearSelectedTrade = () => {
    setSelectedTrade(null);
  };

  const toggleFilter = (filter: 'recent' | 'profitable' | 'all') => {
    setActiveFilter(filter);
    setSearchTerm('');
    setCurrentPage(1); // Reset to first page when changing filters
  };

  // Filter trades based on search term and active filter
  const getFilteredTrades = () => {
    // First apply the search filter if there's a search term
    let filtered = searchTerm 
      ? allTrades.filter(trade => 
          trade.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trade.date.includes(searchTerm) ||
          trade.action.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : [...allTrades];
    
    // Then apply the active category filter
    if (activeFilter === 'recent') {
      // Sort by date descending
      return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeFilter === 'profitable') {
      // Sort by profitability
      return filtered
        .filter(trade => trade.profitLoss > 0)
        .sort((a, b) => b.profitLoss - a.profitLoss);
    }
    
    // Default return all filtered trades
    return filtered;
  };

  const filteredTrades = getFilteredTrades();
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTrades = filteredTrades.slice(indexOfFirstItem, indexOfLastItem);
  
  // Handle page changes
  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // Format profit/loss with appropriate color
  const formatProfitLoss = (profitLoss: number) => {
    const formattedValue = profitLoss.toFixed(2);
    const textColor = profitLoss >= 0 ? 'text-green-600' : 'text-red-600';
    const sign = profitLoss >= 0 ? '+' : '';
    return <span className={textColor}>{sign}${formattedValue}</span>;
  };

  // Function to reset conversation
  const handleResetConversation = () => {
    setResetKey(prevKey => prevKey + 1);
  };

  return (
    <main className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col flex-grow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chat with PIP</h1>
        <button 
          onClick={() => setShowTradeSearch(!showTradeSearch)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Search className="h-4 w-4" />
          {showTradeSearch ? 'Hide Trade Selection' : 'Select a Trade'}
        </button>
      </div>

      <div className="flex-grow flex flex-col">
        {showTradeSearch && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select a Trade to Discuss</h2>
            
            {/* Filter tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => toggleFilter('recent')}
                className={`flex items-center mr-4 pb-2 px-1 ${
                  activeFilter === 'recent' 
                    ? 'border-b-2 border-indigo-500 text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="h-4 w-4 mr-1" />
                <span>Recent</span>
              </button>
              <button
                onClick={() => toggleFilter('profitable')}
                className={`flex items-center mr-4 pb-2 px-1 ${
                  activeFilter === 'profitable' 
                    ? 'border-b-2 border-indigo-500 text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Profitable</span>
              </button>
              <button
                onClick={() => toggleFilter('all')}
                className={`flex items-center mr-4 pb-2 px-1 ${
                  activeFilter === 'all' 
                    ? 'border-b-2 border-indigo-500 text-indigo-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Filter className="h-4 w-4 mr-1" />
                <span>All</span>
              </button>
            </div>
            
            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search trades by pair, date, or action..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {loading ? (
              <p className="text-center py-4">Loading trades...</p>
            ) : error ? (
              <p className="text-red-500 text-center py-4">Error: {error}</p>
            ) : filteredTrades.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No trades found.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentTrades.map(trade => (
                    <div 
                      key={trade.id}
                      onClick={() => handleTradeSelect(trade)}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
                        selectedTrade?.id === trade.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{trade.pair}</div>
                        <div className="text-xs text-gray-500">{trade.date} {trade.entryTime && `at ${trade.entryTime}`}</div>
                      </div>
                      <div className="mt-1 flex justify-between items-center">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          trade.action.toUpperCase() === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.action}
                        </span>
                        <div className="font-medium">
                          {formatProfitLoss(trade.profitLoss)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center mt-6 gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded border ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Logic for showing page numbers around current page
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center rounded ${
                              currentPage === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-1 self-end text-gray-500">...</span>
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-100"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded border ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 text-center mt-2">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTrades.length)} of {filteredTrades.length} trades
                </div>
              </>
            )}
          </div>
        )}

        {selectedTrade && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium text-gray-800">Currently Discussing:</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleResetConversation}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  title="Reset conversation"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset Chat
                </button>
                <button 
                  onClick={clearSelectedTrade}
                  className="flex items-center text-sm text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Selection
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="text-sm bg-white p-2 rounded border border-gray-200">
                <span className="font-medium">Date:</span> {selectedTrade.date}
              </div>
              {selectedTrade.entryTime && (
                <div className="text-sm bg-white p-2 rounded border border-gray-200">
                  <span className="font-medium">Time:</span> {selectedTrade.entryTime}
                </div>
              )}
              <div className="text-sm bg-white p-2 rounded border border-gray-200">
                <span className="font-medium">Pair:</span> {selectedTrade.pair}
              </div>
              <div className="text-sm bg-white p-2 rounded border border-gray-200">
                <span className="font-medium">Action:</span> {selectedTrade.action}
              </div>
              <div className="text-sm bg-white p-2 rounded border border-gray-200">
                <span className="font-medium">P/L:</span> {formatProfitLoss(selectedTrade.profitLoss)}
              </div>
            </div>
          </div>
        )}

        <div className="flex-grow">
          <div className="flex justify-between items-center mb-2">
            <div>{/* Empty div for flex spacing */}</div>
            {!selectedTrade && (
              <button 
                onClick={handleResetConversation}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                title="Reset conversation"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset Chat
              </button>
            )}
          </div>
          <TradeChatBox key={resetKey} trade={selectedTrade} onClose={() => {}} />
          {!selectedTrade && !showTradeSearch && (
            <p className="mt-4 text-sm text-gray-500">
              Use the "Select a Trade" button above to discuss a specific trade from your history.
            </p>
          )}
        </div>
      </div>
    </main>
  );
} 