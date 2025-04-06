import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { getTrades } from '../lib/api';
import { Trade } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

// Days of the week
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TradesAnalysis() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("All Trades");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load trades
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

  // Filter trades by selected month and year
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

  // Update useEffect for filterTrades when dependencies change
  useEffect(() => {
    if (trades.length > 0) {
      filterTrades();
    }
  }, [selectedMonth, selectedYear, trades]);

  // Handle month selection
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedMonth(selected);
  };

  // Handle year selection
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedYear(selected);
  };

  // Analyze market conditions
  const marketConditionAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;

    const conditions: Record<string, { total: number, wins: number, losses: number, profitLoss: number }> = {};
    
    filteredTrades.forEach(trade => {
      const condition = trade.marketCondition || 'Unknown';
      
      if (!conditions[condition]) {
        conditions[condition] = { total: 0, wins: 0, losses: 0, profitLoss: 0 };
      }
      
      conditions[condition].total += 1;
      conditions[condition].profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        conditions[condition].wins += 1;
      } else {
        conditions[condition].losses += 1;
      }
    });
    
    return Object.entries(conditions).map(([condition, stats]) => ({
      condition,
      total: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
      profitLoss: stats.profitLoss
    }));
  }, [filteredTrades]);

  // Analyze days of the week
  const dayOfWeekAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;

    const days: Record<string, { total: number, wins: number, losses: number, profitLoss: number }> = {};
    
    daysOfWeek.forEach(day => {
      days[day] = { total: 0, wins: 0, losses: 0, profitLoss: 0 };
    });
    
    filteredTrades.forEach(trade => {
      const day = trade.day || 'Unknown';
      
      if (!days[day]) {
        days[day] = { total: 0, wins: 0, losses: 0, profitLoss: 0 };
      }
      
      days[day].total += 1;
      days[day].profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        days[day].wins += 1;
      } else {
        days[day].losses += 1;
      }
    });
    
    return Object.entries(days).map(([day, stats]) => ({
      day,
      total: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
      profitLoss: stats.profitLoss
    }));
  }, [filteredTrades]);

  // Analyze trend alignment
  const trendAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;

    const withTrend = {
      label: 'With the Trend',
      description: 'Buy + Bullish OR Sell + Bearish',
      total: 0,
      wins: 0,
      losses: 0,
      profitLoss: 0
    };

    const againstTrend = {
      label: 'Against the Trend',
      description: 'Buy + Bearish OR Sell + Bullish',
      total: 0,
      wins: 0,
      losses: 0,
      profitLoss: 0
    };

    filteredTrades.forEach(trade => {
      // Skip trades with missing data
      if (!trade.action || !trade.direction) return;

      const isWithTrend = 
        (trade.action === 'Buy' && trade.direction === 'Bullish') || 
        (trade.action === 'Sell' && trade.direction === 'Bearish');
      
      const target = isWithTrend ? withTrend : againstTrend;
      
      target.total += 1;
      target.profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        target.wins += 1;
      } else {
        target.losses += 1;
      }
    });

    return [
      {
        ...withTrend,
        winRate: withTrend.total > 0 ? Math.round((withTrend.wins / withTrend.total) * 100) : 0
      },
      {
        ...againstTrend,
        winRate: againstTrend.total > 0 ? Math.round((againstTrend.wins / againstTrend.total) * 100) : 0
      }
    ];
  }, [filteredTrades]);

  // Chart data for market conditions
  const marketConditionChartData = useMemo(() => {
    if (!marketConditionAnalysis) return null;
    
    return {
      labels: marketConditionAnalysis.map(item => item.condition),
      datasets: [
        {
          label: 'Win Rate %',
          data: marketConditionAnalysis.map(item => item.winRate),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Total Trades',
          data: marketConditionAnalysis.map(item => item.total),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [marketConditionAnalysis]);

  // Chart data for days of the week
  const dayOfWeekChartData = useMemo(() => {
    if (!dayOfWeekAnalysis) return null;
    
    return {
      labels: dayOfWeekAnalysis.map(item => item.day),
      datasets: [
        {
          label: 'Wins',
          data: dayOfWeekAnalysis.map(item => item.wins),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
        {
          label: 'Losses',
          data: dayOfWeekAnalysis.map(item => item.losses),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
        },
      ],
    };
  }, [dayOfWeekAnalysis]);

  // Chart data for trend analysis
  const trendChartData = useMemo(() => {
    if (!trendAnalysis) return null;
    
    return {
      labels: trendAnalysis.map(item => item.label),
      datasets: [
        {
          label: 'Win Rate %',
          data: trendAnalysis.map(item => item.winRate),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Total Trades',
          data: trendAnalysis.map(item => item.total),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [trendAnalysis]);

  // Chart options for bar charts
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance by Category',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Trades Analysis</h1>
            
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
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-center my-8">{error}</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Market Condition Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Market Condition Analysis</h2>
                  {marketConditionAnalysis && marketConditionAnalysis.length > 0 ? (
                    <>
                      <div className="mb-6 h-64">
                        {marketConditionChartData && (
                          <Bar data={marketConditionChartData} options={barChartOptions} />
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Condition</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {marketConditionAnalysis.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.condition}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.wins}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.losses}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.winRate}%</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.profitLoss.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">No market condition data available.</p>
                  )}
                </div>

                {/* Day of Week Analysis */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Day of Week Analysis</h2>
                  {dayOfWeekAnalysis && dayOfWeekAnalysis.length > 0 ? (
                    <>
                      <div className="mb-6 h-64">
                        {dayOfWeekChartData && (
                          <Bar data={dayOfWeekChartData} options={barChartOptions} />
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {dayOfWeekAnalysis.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.day}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.wins}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.losses}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.winRate}%</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.profitLoss.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">No day of week data available.</p>
                  )}
                </div>
              </div>

              {/* Trend Analysis - Full width in its own row */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Trend Analysis</h2>
                {trendAnalysis && trendAnalysis.length > 0 ? (
                  <>
                    <div className="mb-6 h-64">
                      {trendChartData && (
                        <Bar data={trendChartData} options={barChartOptions} />
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {trendAnalysis.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.label}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.wins}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.losses}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.winRate}%</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.profitLoss.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No trend data available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 