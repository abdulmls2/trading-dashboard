import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TradeHistoryTable from '../components/TradeHistoryTable';
import { Trade } from '../types';
import { getTrades, deleteTrade, useEffectiveUserId, clearCacheForMonthOnDeletion } from '../lib/api';
import TradeForm from '../components/TradeForm';
import { PlusCircle } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';

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

export default function Journal() {
  const effectiveUserId = useEffectiveUserId();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedCurrency, setSelectedCurrency] = useState(getSavedCurrency());
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const itemsPerPage = 30; // Always fetch 30 trades per page
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Function to load trades for the current page with filters
  const loadTrades = useCallback(async (currentPageToLoad = page) => {
    console.log("Journal: loadTrades called. EffectiveUserId:", effectiveUserId, 
      "Page:", currentPageToLoad, 
      "Month:", selectedMonth, 
      "Year:", selectedYear, 
      "Account:", currentAccount?.id,
      "itemsPerPage:", itemsPerPage);
    
    if (!effectiveUserId || !user) { 
      console.warn("Journal: No effectiveUserId or user available, cannot load trades");
      setLoading(false);
      return;
    }
    
    const accountIdToFetch = currentAccount?.id || null;
    
    console.log(`Journal: Fetching data for accountId: ${accountIdToFetch}, page: ${currentPageToLoad}, perPage: ${itemsPerPage}, month: ${selectedMonth}, year: ${selectedYear}`);
    
    setLoading(true);
    setError(null);
    try {
      const { trades: tradeData, totalCount: count } = await getTrades(
        effectiveUserId, 
        accountIdToFetch,
        currentPageToLoad,
        itemsPerPage,
        selectedMonth,
        selectedYear
      );
      
      console.log(`Journal: Loaded ${tradeData.length} trades. User ID: ${effectiveUserId}, Account: ${accountIdToFetch || 'all'}, Total returned: ${count}`);
      
      const formattedTrades = tradeData.map(trade => ({ ...trade, time: trade.entryTime }));
      setTrades(formattedTrades);
      setTotalCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
      console.error("Journal: Failed to load trades:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, currentAccount, user, itemsPerPage, selectedMonth, selectedYear]);

  // useEffect for loading trades. Runs when critical parameters change.
  useEffect(() => {
    console.log(`Journal: Data loading useEffect triggered. Page: ${page}, itemsPerPage: ${itemsPerPage}, Filters: M=${selectedMonth} Y=${selectedYear}, Account: ${currentAccount?.id}`);
    if (effectiveUserId && !accountLoading && user) {
      loadTrades(page);
    }
  }, [page, itemsPerPage, selectedMonth, selectedYear, currentAccount, effectiveUserId, accountLoading, user, loadTrades]);

  // Update currency if it changes in another tab/window
  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedCurrency(getSavedCurrency());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handler for deleting trades
  const handleDeleteTrades = async (tradeIds: string[]) => {
    try {
      // Clear cache for the current view *before* deleting and reloading
      if (effectiveUserId && selectedMonth !== 'All Trades' && selectedYear !== 'All Years') {
        console.log(`[Journal] Clearing cache for month: ${selectedMonth}, year: ${selectedYear}, user: ${effectiveUserId}, account: ${currentAccount?.id || 'all_accounts'} before deleting trades.`);
        clearCacheForMonthOnDeletion(effectiveUserId, currentAccount?.id || null, selectedYear, selectedMonth);
      }

      await Promise.all(tradeIds.map(id => deleteTrade(id)));
      await loadTrades(page); // Refresh current page
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trades');
      console.error('Journal: Failed to delete trades:', err);
      // Attempt to refresh even on error, which might fetch from cache if clearing failed or not applicable
      await loadTrades(page); 
    }
  };

  // Handler for selecting a trade
  const handleSelectTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    setShowTradeForm(true);
  };

  // Handler for closing the trade form modal
  const handleTradeFormClose = async () => {
    setShowTradeForm(false);
    setSelectedTrade(null);
    await loadTrades(page); // Refresh current page
  };

  // Renamed from handleFullScreenChange to be more specific as a toggle handler
  const handleToggleFullScreenLayout = () => {
    const newFSState = !isFullScreen;
    console.log(`Journal: handleToggleFullScreenLayout. Old state: ${isFullScreen}, New state: ${newFSState}`);
    setIsFullScreen(newFSState);
    // Reset to page 1 when fullscreen mode changes, because itemsPerPage changes.
    // The main data loading useEffect will pick up both isFullScreen (via itemsPerPage) and page changes.
    if (page !== 1) {
        setPage(1); 
    }
  };

  // Handlers for dropdown changes
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    setPage(1); // Reset to page 1 when filter changes
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    setPage(1); // Reset to page 1 when filter changes
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    console.log(`Journal: Page change requested to ${newPage}, current page: ${page}`);
    setPage(newPage);
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
            >
              <option value="All Years">All Years</option>
              {getAvailableYears().map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
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
          <button onClick={() => loadTrades(page)} className="ml-4 px-2 py-1 bg-red-500 text-white rounded">Retry</button>
        </div>
      )}

      <div className={`flex-grow flex`}>
        <div className={`flex flex-col w-full`}>
          {loading ? (
            <div className={`
              flex items-center justify-center 
              ${isFullScreen ? 'fixed inset-0 z-40 bg-white' : 'flex-grow'}
            `}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="flex-grow">
              <TradeHistoryTable
                trades={trades}
                onSelectTrade={handleSelectTrade}
                onDeleteTrades={handleDeleteTrades}
                selectedCurrency={selectedCurrency}
                isFullScreenLayout={isFullScreen}
                onToggleFullScreenLayout={handleToggleFullScreenLayout}
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                actualItemsPerPage={itemsPerPage}
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
                  targetUserId={effectiveUserId || undefined}
                />
              </div>
            </div>
          </div>
        )}
    </main>
  );
} 