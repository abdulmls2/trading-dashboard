import React, { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isValid, parseISO, startOfMonth, endOfMonth } from 'date-fns';
// import Header from '../components/Header'; // Ensure this is removed or commented out
import { Trade, TradeCalendarDay } from '../types';
import { getCalendarTrades, useEffectiveUserId } from '../lib/api';
import { ArrowLeft, ArrowRight, Pencil, X } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { supabase } from '../lib/supabase'; // Import supabase

// Type for market data
interface MarketData {
  id?: string;
  date: Date;
  marketCondition: string;
  apm: string;
  gap: string;
  pivots: string;
  balance: string;
  currencyIndex: string;
  currentPrice: string;
  news: string;
  created_at?: string;
  updated_at?: string;
}

export default function CalendarPage() {
  const effectiveUserId = useEffectiveUserId();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const { user } = useAuth(); // Get actual user
  const [value, setValue] = useState<Date>(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMarketData, setLoadingMarketData] = useState(true); // Add loading state for market data
  const [error, setError] = useState('');
  const [marketDataError, setMarketDataError] = useState(''); // Add error state for market data
  // New state for view toggle
  const [calendarView, setCalendarView] = useState<'trades' | 'marketData'>('trades');
  // State to track if the user is an admin
  const [isAdmin, setIsAdmin] = useState(false);
  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMarketData, setEditingMarketData] = useState<MarketData | null>(null);
  // State for trading day data
  const [tradingDayData, setTradingDayData] = useState<Record<string, MarketData>>({});
  // State to track the currently viewed month on the calendar
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  // State to track the calendar's internal view (e.g., month, year, decade)
  const [currentCalendarInternalView, setCurrentCalendarInternalView] = useState<'month' | 'year' | 'decade' | 'century'>('month');

  useEffect(() => {
    // Check if user is admin by looking at the user's role in the Profiles table
    async function checkAdminStatus() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error checking admin status:', error);
          return;
        }
        
        setIsAdmin(data?.role === 'admin');
      } catch (err) {
        console.error('Failed to check admin status:', err);
      }
    }
    
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    // Load trades based on effective user and account
    async function loadTrades() {
      if (!effectiveUserId || !user) {
        console.warn("No effectiveUserId or user available, cannot load trades for calendar");
        setLoading(false);
        return;
      }

      // Check if the current calendar internal view is 'month' before loading
      if (currentCalendarInternalView !== 'month') {
        console.log(`Calendar: View is ${currentCalendarInternalView}, not 'month'. Skipping trade load for activeStartDate: ${activeStartDate?.toISOString()}`);
        setLoading(false); // Ensure loading is set to false
        return;
      }

      // Always use the currentAccount from context
      const accountIdToFetch = currentAccount?.id || null;

      try {
        setLoading(true);
        
        // Get month and year from activeStartDate
        const month = activeStartDate.getMonth();
        const year = activeStartDate.getFullYear();
        
        console.log(`Calendar: Loading trades for user ${effectiveUserId}, account ${accountIdToFetch || 'all'}, month: ${month + 1}/${year}`);
        
        // Using the optimized getCalendarTrades function with month and year parameters
        const calendarTrades = await getCalendarTrades(effectiveUserId, accountIdToFetch, month, year);
        
        console.log(`Calendar: Loaded ${calendarTrades.length} trades for user ${effectiveUserId} and account ${accountIdToFetch || 'all'}`);

        // Add type assertion to satisfy TypeScript
        setTrades(calendarTrades as Trade[]);
      } catch (err) {
        console.error("Failed to load trades for calendar:", err);
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }

    if (effectiveUserId && !accountLoading && user) {
      loadTrades();
    }
  }, [effectiveUserId, currentAccount, accountLoading, user, activeStartDate, currentCalendarInternalView]); // Add activeStartDate and currentCalendarInternalView to dependency array

  // Function to load trading day data from Supabase for the specified month
  const loadTradingDayData = async (dateForMonth: Date) => {
    try {
      setLoadingMarketData(true);
      setMarketDataError(''); // Clear previous errors
      
      // Get month boundaries based on the provided date
      const firstDayOfMonth = startOfMonth(dateForMonth);
      const lastDayOfMonth = endOfMonth(dateForMonth);
      
      // Format dates for query
      const startDateStr = format(firstDayOfMonth, 'yyyy-MM-dd');
      const endDateStr = format(lastDayOfMonth, 'yyyy-MM-dd');
      
      console.log(`Loading market data for range: ${startDateStr} to ${endDateStr}`);
      
      // Query the trading_day_data table
      const { data, error } = await supabase
        .from('trading_day_data')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      if (error) {
        console.error('Error loading trading day data:', error);
        setMarketDataError(error.message);
        setTradingDayData({}); // Clear data on error
        return;
      }
      
      // Convert the data to our format
      const formattedData: Record<string, MarketData> = {};
      
      data.forEach(item => {
        // Ensure date parsing is correct
        try {
          const date = parseISO(item.date);
          const dateKey = format(date, 'yyyy-MM-dd');
          formattedData[dateKey] = {
            id: item.id,
            date: date,
            marketCondition: item.market_condition || '',
            apm: item.apm || '',
            gap: item.gap || '',
            pivots: item.pivots || '',
            balance: item.balance || '',
            currencyIndex: item.currency_index || '',
            currentPrice: item.current_price || '',
            news: item.news || '',
            created_at: item.created_at,
            updated_at: item.updated_at
          };
        } catch (parseError) {
          console.error(`Failed to parse date: ${item.date}`, parseError);
        }
      });
      
      setTradingDayData(formattedData);
      console.log(`Loaded ${Object.keys(formattedData).length} trading day data records for the month`);
    } catch (err) {
      console.error('Failed to load trading day data:', err);
      setMarketDataError(err instanceof Error ? err.message : 'Failed to load market data');
      setTradingDayData({}); // Clear data on error
    } finally {
      setLoadingMarketData(false);
    }
  };

  // Load market data when the active month changes and view is 'month'
  useEffect(() => {
    if (user) {
      if (currentCalendarInternalView === 'month') {
        loadTradingDayData(activeStartDate);
      } else {
        console.log(`Calendar: View is ${currentCalendarInternalView}, not 'month'. Skipping market data load for activeStartDate: ${activeStartDate?.toISOString()}`);
        setLoadingMarketData(false); // Ensure loading is set to false
        // Optionally clear existing market data if needed when not in month view
        // setTradingDayData({}); 
      }
    }
  }, [user, activeStartDate, currentCalendarInternalView]); // Reload when activeStartDate or currentCalendarInternalView changes

  // Modify the trade grouping logic to prevent timezone issues
  const tradesByDate = useMemo(() => {
    const grouped: Record<string, TradeCalendarDay> = {};
    
    trades.forEach(trade => {
      // Handle the date string directly without timezone conversion
      if (!trade.date) return;
      
      // Use the date string directly without creating a new Date object
      // This prevents timezone shifts
      const dateKey = trade.date; // Already in YYYY-MM-DD format from the database
      
      if (!grouped[dateKey]) {
        // Create a date object only for display purposes
        const dateParts = dateKey.split('-');
        if (dateParts.length !== 3) return;
        
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateParts[2]);
        
        // Create date with a specific time to avoid timezone issues
        const date = new Date(year, month, day, 12, 0, 0);
        
        grouped[dateKey] = {
          date,
          trades: [],
          totalProfitLoss: 0,
          winCount: 0,
          lossCount: 0,
          breakEvenCount: 0
        };
      }
      
      grouped[dateKey].trades.push(trade);
      grouped[dateKey].totalProfitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        grouped[dateKey].winCount += 1;
      } else if (trade.profitLoss < 0) {
        grouped[dateKey].lossCount += 1;
      } else {
        grouped[dateKey].breakEvenCount += 1;
      }
    });
    
    return grouped;
  }, [trades]);

  // Calendar event handlers
  const handleDateClick = (date: Date) => {
    setValue(date);
    setSelectedDate(date);
  };

  // Update active start date when user navigates months
  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      setActiveStartDate(activeStartDate);
    }
  };

  // Handle calendar view changes (e.g., month, year, decade)
  const handleViewChange = ({ activeStartDate: newActiveStartDate, view: newView }: { activeStartDate: Date | null; view: 'month' | 'year' | 'decade' | 'century'; }) => {
    if (newActiveStartDate) {
      setActiveStartDate(newActiveStartDate); // Update activeStartDate based on view change
    }
    if (newView) {
      setCurrentCalendarInternalView(newView);
    }
  };

  // Also update the tileClassName and tileContent functions to use the same date format
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    // Only apply custom classes to month view
    if (view !== 'month') return null;

    // Convert to YYYY-MM-DD format without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    // Only style calendar boxes in trades view
    if (calendarView === 'trades') {
      const dayData = tradesByDate[dateKey];
      
      if (!dayData) return null;
  
      // Base the color on overall profitability for the day
      if (dayData.totalProfitLoss > 0) {
        return 'bg-green-200 hover:bg-green-300 rounded-lg shadow-sm'; // Green for profitable days
      } else if (dayData.totalProfitLoss < 0) {
        return 'bg-red-200 hover:bg-red-300 rounded-lg shadow-sm'; // Red for losing days
      } else if (dayData.totalProfitLoss === 0 && dayData.trades.length > 0) {
        return 'bg-gray-200 hover:bg-gray-300 rounded-lg shadow-sm'; // Gray for break-even days
      }
    }
    
    return null;
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    // Only add content in month view
    if (view !== 'month') return null;

    // Convert to YYYY-MM-DD format without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    if (calendarView === 'trades') {
      const dayData = tradesByDate[dateKey];
      
      if (!dayData) return null;
  
      const totalTrades = dayData.winCount + dayData.lossCount + dayData.breakEvenCount;
      
      return (
        <div className="text-xs mt-1 leading-tight">
          <div className="flex justify-center items-center space-x-1">
            {dayData.winCount > 0 && <span className="text-green-600">{dayData.winCount}W</span>}
            {dayData.lossCount > 0 && <span className="text-red-600">{dayData.lossCount}L</span>}
            {dayData.breakEvenCount > 0 && <span className="text-gray-600">{dayData.breakEvenCount}BE</span>}
          </div>
          <div className={`font-semibold ${dayData.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${Math.abs(dayData.totalProfitLoss).toFixed(1)}
          </div>
        </div>
      );
    } else {
      // For market data view, don't show any content on the calendar boxes
      return null;
    }
  };

  // Fix the selectedDateDetails logic to use consistent date format
  const selectedDateDetails = useMemo(() => {
    if (!selectedDate) return null;
    
    // Convert to YYYY-MM-DD format without timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    if (calendarView === 'trades') {
      return tradesByDate[dateKey] || null;
    } else {
      return tradingDayData[dateKey] || null;
    }
  }, [selectedDate, tradesByDate, tradingDayData, calendarView]);

  // Function to open edit modal
  const openEditModal = (marketData?: MarketData) => {
    if (marketData) {
      // Edit existing data
      setEditingMarketData({...marketData});
    } else if (selectedDate) {
      // Create new data for the selected date
      setEditingMarketData({
        date: selectedDate,
        marketCondition: 'Balanced', // Default values
        apm: '',
        gap: 'No Gap',
        pivots: 'Valid',
        balance: 'Balanced',
        currencyIndex: '',
        currentPrice: '',
        news: ''
      });
    }
    setIsEditModalOpen(true);
  };

  // Function to close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMarketData(null);
  };

  // Function to handle field changes in the edit modal
  const handleFieldChange = (field: keyof MarketData, value: string) => {
    if (!editingMarketData) return;
    
    setEditingMarketData({
      ...editingMarketData,
      [field]: value
    });
  };

  // Function to save edited market data
  const saveMarketData = async () => {
    if (!editingMarketData || !selectedDate) return;
    
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      
      // Prepare data for the database (convert from camelCase to snake_case)
      const dataToSave = {
        date: dateKey,
        market_condition: editingMarketData.marketCondition,
        apm: editingMarketData.apm,
        gap: editingMarketData.gap,
        pivots: editingMarketData.pivots,
        balance: editingMarketData.balance,
        currency_index: editingMarketData.currencyIndex,
        current_price: editingMarketData.currentPrice,
        news: editingMarketData.news
      };
      
      let result;
      
      // If the data already has an ID, update it; otherwise insert new record
      if (editingMarketData.id) {
        // Update existing record
        result = await supabase
          .from('trading_day_data')
          .update(dataToSave)
          .eq('id', editingMarketData.id)
          .select('*') // Ensure we get the updated data back
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('trading_day_data')
          .insert(dataToSave)
          .select('*')
          .single();
      }
      
      if (result.error) {
        throw result.error;
      }

      // Update the local state immediately with the saved/updated data
      if (result.data) {
        const savedItem = result.data;
        const updatedDateKey = format(parseISO(savedItem.date), 'yyyy-MM-dd');
        setTradingDayData(prevData => ({
          ...prevData,
          [updatedDateKey]: {
            id: savedItem.id,
            date: parseISO(savedItem.date),
            marketCondition: savedItem.market_condition || '',
            apm: savedItem.apm || '',
            gap: savedItem.gap || '',
            pivots: savedItem.pivots || '',
            balance: savedItem.balance || '',
            currencyIndex: savedItem.currency_index || '',
            currentPrice: savedItem.current_price || '',
            news: savedItem.news || '',
            created_at: savedItem.created_at,
            updated_at: savedItem.updated_at
          }
        }));
      }
      
      // Close the modal
      closeEditModal();
      
      // Show success message
      alert('Market data saved successfully!');
    } catch (err) {
      console.error('Error saving market data:', err);
      alert('Failed to save market data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Trading Calendar</h1>
          
          {/* Toggle switch for view modes */}
          <div className="mt-4 md:mt-0 inline-flex shadow-sm rounded-md">
            <button
              onClick={() => setCalendarView('trades')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                calendarView === 'trades'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300`}
            >
              My Trades
            </button>
            <button
              onClick={() => setCalendarView('marketData')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                calendarView === 'marketData'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 border-l-0`}
            >
              Market Data
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {calendarView === 'marketData' && marketDataError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            Error loading market data: {marketDataError}
          </div>
        )}

        {loading && calendarView === 'trades' ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : loadingMarketData && calendarView === 'marketData' ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="react-calendar-wrapper">
                  <Calendar
                    onClickDay={handleDateClick}
                    value={value}
                    tileClassName={tileClassName}
                    tileContent={tileContent}
                    prevLabel={<ArrowLeft className="w-5 h-5" />}
                    nextLabel={<ArrowRight className="w-5 h-5" />}
                    className="custom-calendar"
                    activeStartDate={activeStartDate} // Control the viewed month
                    onActiveStartDateChange={handleActiveStartDateChange} // Handle month navigation
                    onViewChange={handleViewChange} // Handle view changes (month, year, decade)
                  />
                </div>
                <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm">
                  {calendarView === 'trades' ? (
                    <>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-md bg-green-200 border border-green-300 shadow-sm mr-2"></div>
                        <span>Profitable Days</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-md bg-red-200 border border-red-300 shadow-sm mr-2"></div>
                        <span>Unprofitable Days</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-md bg-gray-200 border border-gray-300 shadow-sm mr-2"></div>
                        <span>Break-Even Days</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Select any day to see detailed market data
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedDate 
                    ? `${calendarView === 'trades' ? 'Trading' : 'Market'} Details: ${format(selectedDate, 'MMMM d, yyyy')}`
                    : `Select a day to view ${calendarView === 'trades' ? 'trading' : 'market'} details`}
                </h2>
                
                {selectedDateDetails ? (
                  calendarView === 'trades' ? (
                    <div>
                      {/* Trades data display - type guard ensures we're using TradeCalendarDay */}
                      {'trades' in selectedDateDetails && (
                        <>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                              <p className="text-sm text-gray-500">Wins</p>
                              <p className="text-xl font-bold text-green-600">{selectedDateDetails.winCount}</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg text-center">
                              <p className="text-sm text-gray-500">Losses</p>
                              <p className="text-xl font-bold text-red-600">{selectedDateDetails.lossCount}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                              <p className="text-sm text-gray-500">Break Even</p>
                              <p className="text-xl font-bold text-gray-600">{selectedDateDetails.breakEvenCount}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <h3 className="text-md font-medium text-gray-700 mb-2">Total P/L</h3>
                            <p className={`text-2xl font-bold ${selectedDateDetails.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${selectedDateDetails.totalProfitLoss.toFixed(2)}
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="text-md font-medium text-gray-700 mb-2">Trades ({selectedDateDetails.trades.length})</h3>
                            <div className="space-y-3 max-h-96 overflow-auto">
                              {selectedDateDetails.trades.map((trade: Trade) => (
                                <div key={trade.id} className={`p-3 rounded-lg border-l-4 ${trade.profitLoss > 0 ? 'border-green-500 bg-green-50' : trade.profitLoss < 0 ? 'border-red-500 bg-red-50' : 'border-gray-500 bg-gray-50'}`}>
                                  <div className="flex justify-between mb-1">
                                    <span className="font-medium">{trade.pair}</span>
                                    <span className={trade.profitLoss > 0 ? 'text-green-600' : trade.profitLoss < 0 ? 'text-red-600' : 'text-gray-600'}>
                                      ${trade.profitLoss.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-500 flex justify-between">
                                    <span>{trade.action}</span>
                                    <span>{trade.entryTime}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : selectedDateDetails && 'marketCondition' in selectedDateDetails ? (
                    <div>
                      {/* Market Data Details */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">Market Details</h3>
                          {isAdmin && (
                            <button
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                              onClick={() => openEditModal(selectedDateDetails as MarketData)}
                              title="Edit market data"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-500">Market Condition</p>
                            <p className="text-lg font-semibold text-gray-800">{selectedDateDetails.marketCondition}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-500">Opening Price</p>
                            <p className="text-lg font-semibold text-gray-800">{selectedDateDetails.currentPrice}</p>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg divide-y">
                          <div className="p-3 flex justify-between">
                            <span className="text-gray-600">APM</span>
                            <span className={`font-medium ${
                              // Check if APM is a number and if it's within the proper range
                              !isNaN(Number(selectedDateDetails.apm)) && 
                              Number(selectedDateDetails.apm) >= 60 && 
                              Number(selectedDateDetails.apm) <= 220 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {selectedDateDetails.apm}
                            </span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span className="text-gray-600">Gap</span>
                            <span className="font-medium">{selectedDateDetails.gap}</span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span className="text-gray-600">Pivots</span>
                            <span className={`font-medium ${
                              selectedDateDetails.pivots === 'Valid' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {selectedDateDetails.pivots}
                            </span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span className="text-gray-600">Balance Status</span>
                            <span className="font-medium">{selectedDateDetails.balance}</span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span className="text-gray-600">Currency Index</span>
                            <span className="font-medium">{selectedDateDetails.currencyIndex}</span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="text-md font-medium text-gray-700 mb-2">Market News</h3>
                          <div className="bg-gray-50 p-3 rounded-lg text-gray-700">
                            {selectedDateDetails.news}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    {selectedDate 
                      ? (
                        <div>
                          <p>No {calendarView === 'trades' ? 'trades' : 'market data'} on this day</p>
                          {calendarView === 'marketData' && isAdmin && (
                            <button
                              onClick={() => openEditModal()}
                              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Add Market Data
                            </button>
                          )}
                        </div>
                      ) 
                      : `Select a day to see ${calendarView === 'trades' ? 'trade' : 'market'} details`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit modal for market data */}
        {isEditModalOpen && editingMarketData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-medium">
                  Edit Market Data: {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
                </h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={closeEditModal}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Market Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Market Condition
                  </label>
                  <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.marketCondition}
                    onChange={(e) => handleFieldChange('marketCondition', e.target.value)}
                  >
                    <option value="Balanced">Balanced</option>
                    <option value="Imbalanced">Imbalanced</option>
                  </select>
                </div>
                
                {/* APM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    APM
                  </label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.apm}
                    onChange={(e) => handleFieldChange('apm', e.target.value)}
                    placeholder="Enter APM details"
                  />
                </div>
                
                {/* Gap */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gap
                  </label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.gap}
                    onChange={(e) => handleFieldChange('gap', e.target.value)}
                    placeholder="Enter gap details"
                  />
                </div>
                
                {/* Pivots */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pivots
                  </label>
                  <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.pivots}
                    onChange={(e) => handleFieldChange('pivots', e.target.value)}
                  >
                    <option value="Valid">Valid</option>
                    <option value="Invalid">Invalid</option>
                  </select>
                </div>
                
                {/* Balance Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance Status
                  </label>
                  <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.balance}
                    onChange={(e) => handleFieldChange('balance', e.target.value)}
                  >
                    <option value="Balanced">Balanced</option>
                    <option value="Broken Upside">Broken Upside</option>
                    <option value="Broken Downside">Broken Downside</option>
                  </select>
                </div>
                
                {/* Currency Index */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency Index
                  </label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.currencyIndex}
                    onChange={(e) => handleFieldChange('currencyIndex', e.target.value)}
                    placeholder="Enter currency index details"
                  />
                </div>
                
                {/* Current Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Price
                  </label>
                  <input
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.currentPrice}
                    onChange={(e) => handleFieldChange('currentPrice', e.target.value)}
                    placeholder="e.g. 1.23456"
                  />
                </div>
                
                {/* News */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Market News
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={editingMarketData.news}
                    onChange={(e) => handleFieldChange('news', e.target.value)}
                    placeholder="Enter market news or events..."
                  ></textarea>
                </div>
              </div>
              
              <div className="p-4 border-t flex justify-end space-x-3">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={saveMarketData}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
        .react-calendar-wrapper {
          /* Add custom styles for calendar container */
          --calendar-border: #eaeaea;
          --calendar-bg: white;
          --calendar-today-bg: #e6f7ff;
          --calendar-selected-bg: #1890ff;
          --calendar-selected-color: white;
        }
        
        /* Override default calendar styles */
        .custom-calendar {
          width: 100%;
          max-width: 100%;
          border: 1px solid var(--calendar-border);
          font-family: inherit;
          line-height: 1.5;
        }
        
        .react-calendar__navigation {
          margin-bottom: 10px;
        }
        
        .react-calendar__month-view__days__day {
          padding: 8px 0;
          height: 80px; /* Taller day cells */
        }
        
        .react-calendar__tile--active {
          background: var(--calendar-selected-bg);
          color: var(--calendar-selected-color);
        }
        
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: var(--calendar-selected-bg);
        }
        `}
      </style>
    </main>
  );
} 