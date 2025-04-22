import React, { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isValid } from 'date-fns';
// import Header from '../components/Header'; // Ensure this is removed or commented out
import { Trade, TradeCalendarDay } from '../types';
import { getTrades, useEffectiveUserId } from '../lib/api';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';

export default function CalendarPage() {
  const effectiveUserId = useEffectiveUserId();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const [value, setValue] = useState<Date>(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTrades() {
      if (!effectiveUserId) {
        console.warn("No effectiveUserId available, cannot load trades for calendar");
        return;
      }
      
      try {
        setLoading(true);
        console.log(`Calendar: Loading trades for user ${effectiveUserId} and account ${currentAccount?.id || 'all'}`);
        const tradeData = await getTrades(effectiveUserId, currentAccount?.id || null);
        console.log(`Calendar: Loaded ${tradeData.length} trades for user ${effectiveUserId} and account ${currentAccount?.name || 'all'}`);
        
        // Add the time property required by the Trade interface
        const formattedTrades = tradeData.map(trade => ({
          ...trade,
          time: trade.entryTime
        }));
        setTrades(formattedTrades);
      } catch (err) {
        console.error("Failed to load trades for calendar:", err);
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }
    
    if (effectiveUserId && !accountLoading) {
      loadTrades();
    }
  }, [effectiveUserId, currentAccount, accountLoading]);

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const groupedTrades: Record<string, TradeCalendarDay> = {};
    
    trades.forEach(trade => {
      const dateStr = trade.date;
      const date = new Date(dateStr);
      
      if (isValid(date)) {
        const dateKey = format(date, 'yyyy-MM-dd');
        
        if (!groupedTrades[dateKey]) {
          groupedTrades[dateKey] = {
            date,
            trades: [],
            totalProfitLoss: 0,
            winCount: 0,
            lossCount: 0,
            breakEvenCount: 0
          };
        }
        
        groupedTrades[dateKey].trades.push(trade);
        groupedTrades[dateKey].totalProfitLoss += trade.profitLoss;
        
        if (trade.profitLoss > 0) {
          groupedTrades[dateKey].winCount += 1;
        } else if (trade.profitLoss < 0) {
          groupedTrades[dateKey].lossCount += 1;
        } else {
          groupedTrades[dateKey].breakEvenCount += 1;
        }
      }
    });
    
    return groupedTrades;
  }, [trades]);

  // Calendar event handlers
  const handleDateClick = (date: Date) => {
    setValue(date);
    setSelectedDate(date);
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    // Only apply custom classes to month view
    if (view !== 'month') return null;

    const dateKey = format(date, 'yyyy-MM-dd');
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
    
    return null;
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    // Only add content in month view
    if (view !== 'month') return null;

    const dateKey = format(date, 'yyyy-MM-dd');
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
  };

  const selectedDateDetails = useMemo(() => {
    if (!selectedDate) return null;
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tradesByDate[dateKey] || null;
  }, [selectedDate, tradesByDate]);

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Trading Calendar</h1>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
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
                  />
                </div>
                <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm">
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
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedDate 
                    ? `Trading Details: ${format(selectedDate, 'MMMM d, yyyy')}`
                    : 'Select a day to view details'}
                </h2>
                
                {selectedDateDetails ? (
                  <div>
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
                        {selectedDateDetails.trades.map(trade => (
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
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    {selectedDate ? 'No trades on this day' : 'Select a day to see trade details'}
                  </div>
                )}
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