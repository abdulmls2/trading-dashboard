import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { getTrades } from '../lib/api';
import { Trade } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Chart } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
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

// Confluence types to analyze
const confluenceTypes = ['pivots', 'bankingLevel', 'ma', 'fib'];
const confluenceLabels = ['Pivots', 'Banking Level', 'MA', 'Fib'];

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

  // Analyze the number of confluences and their impact on trade performance
  const confluenceAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;

    // Initialize data structure to track trades by number of confluences
    const byConfluenceCount: Record<number, { total: number, wins: number, losses: number, profitLoss: number }> = {
      0: { total: 0, wins: 0, losses: 0, profitLoss: 0 },
      1: { total: 0, wins: 0, losses: 0, profitLoss: 0 },
      2: { total: 0, wins: 0, losses: 0, profitLoss: 0 },
      3: { total: 0, wins: 0, losses: 0, profitLoss: 0 },
      4: { total: 0, wins: 0, losses: 0, profitLoss: 0 }
    };

    filteredTrades.forEach(trade => {
      // Count the number of confluences present in this trade
      let confluenceCount = 0;
      
      if (trade.pivots && trade.pivots !== 'None' && trade.pivots !== 'none' && trade.pivots !== '') confluenceCount++;
      if (trade.bankingLevel && trade.bankingLevel !== 'None' && trade.bankingLevel !== 'none' && trade.bankingLevel !== '') confluenceCount++;
      if (trade.ma && trade.ma !== 'None' && trade.ma !== 'none' && trade.ma !== '') confluenceCount++;
      if (trade.fib && trade.fib !== 'None' && trade.fib !== 'none' && trade.fib !== '') confluenceCount++;
      
      // Add trade data to the appropriate confluence count bucket
      if (!byConfluenceCount[confluenceCount]) {
        byConfluenceCount[confluenceCount] = { total: 0, wins: 0, losses: 0, profitLoss: 0 };
      }
      
      byConfluenceCount[confluenceCount].total += 1;
      byConfluenceCount[confluenceCount].profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        byConfluenceCount[confluenceCount].wins += 1;
      } else {
        byConfluenceCount[confluenceCount].losses += 1;
      }
    });
    
    // Convert to array format for easier rendering
    return Object.entries(byConfluenceCount).map(([count, stats]) => ({
      confluenceCount: parseInt(count),
      total: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
      profitLoss: stats.profitLoss,
      avgProfitLoss: stats.total > 0 ? stats.profitLoss / stats.total : 0
    })).filter(item => item.total > 0); // Filter out confluence counts with no trades
  }, [filteredTrades]);

  // Analyze which specific groups of confluences work best
  const confluenceGroupAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;
    
    // Map to store the performance of each confluence combination
    const combinationPerformance: Record<string, { 
      total: number, 
      wins: number, 
      losses: number, 
      profitLoss: number,
      valueMap: Record<string, Record<string, number>> // Track actual values
    }> = {};
    
    // Analyze each trade
    filteredTrades.forEach(trade => {
      // Create a combination key based on which confluences are present with their actual values
      const activeConfluences: string[] = [];
      const valueDetails: Record<string, string> = {};
      
      // Check each confluence and store its value if present
      if (trade.pivots && trade.pivots !== 'None' && trade.pivots !== 'none' && trade.pivots !== '') {
        activeConfluences.push('P');
        valueDetails['P'] = trade.pivots;
      }
      
      if (trade.bankingLevel && trade.bankingLevel !== 'None' && trade.bankingLevel !== 'none' && trade.bankingLevel !== '') {
        activeConfluences.push('B');
        valueDetails['B'] = trade.bankingLevel;
      }
      
      if (trade.ma && trade.ma !== 'None' && trade.ma !== 'none' && trade.ma !== '') {
        activeConfluences.push('M');
        valueDetails['M'] = trade.ma;
      }
      
      if (trade.fib && trade.fib !== 'None' && trade.fib !== 'none' && trade.fib !== '') {
        activeConfluences.push('F');
        valueDetails['F'] = trade.fib;
      }
      
      // Skip if no confluences are present
      if (activeConfluences.length === 0) return;
      
      // Create key with actual values
      const combinationKey = activeConfluences.map(code => {
        return `${code}:${valueDetails[code]}`;
      }).join(' + ');
      
      // Initialize the combination in our map if it doesn't exist
      if (!combinationPerformance[combinationKey]) {
        combinationPerformance[combinationKey] = { 
          total: 0, 
          wins: 0, 
          losses: 0, 
          profitLoss: 0,
          valueMap: {
            'P': {}, // Pivots values
            'B': {}, // Banking Level values
            'M': {}, // MA values
            'F': {}  // Fib values
          }
        };
      }
      
      // Update the stats for this combination
      const combo = combinationPerformance[combinationKey];
      combo.total += 1;
      combo.profitLoss += trade.profitLoss;
      
      // Track value frequencies
      for (const code of activeConfluences) {
        const value = valueDetails[code];
        if (!combo.valueMap[code][value]) {
          combo.valueMap[code][value] = 0;
        }
        combo.valueMap[code][value] += 1;
      }
      
      if (trade.profitLoss > 0) {
        combo.wins += 1;
      } else {
        combo.losses += 1;
      }
    });
    
    // Convert to array and calculate derived metrics
    const result = Object.entries(combinationPerformance)
      .map(([combination, stats]) => {
        return {
          combination,
          total: stats.total,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
          profitLoss: stats.profitLoss,
          avgProfitLoss: stats.total > 0 ? stats.profitLoss / stats.total : 0,
          valueMap: stats.valueMap
        };
      })
      // Sort by win rate (highest first) and then by average P/L
      .sort((a, b) => b.winRate - a.winRate || b.avgProfitLoss - a.avgProfitLoss);
    
    // Return the top combinations (if we have that many)
    return result.slice(0, 15);
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

  // Chart data for confluence analysis
  const confluenceChartData = useMemo(() => {
    if (!confluenceAnalysis) return null;
    
    return {
      labels: confluenceAnalysis.map(item => `${item.confluenceCount} Confluence${item.confluenceCount !== 1 ? 's' : ''}`),
      datasets: [
        {
          label: 'Win Rate %',
          data: confluenceAnalysis.map(item => item.winRate),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          type: 'bar' as const,
        },
        {
          label: 'Avg P/L',
          data: confluenceAnalysis.map(item => item.avgProfitLoss),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
          type: 'bar' as const,
        }
      ],
    };
  }, [confluenceAnalysis]);

  // Chart data for confluence groups
  const confluenceGroupChartData = useMemo(() => {
    if (!confluenceGroupAnalysis) return null;
    
    return {
      labels: confluenceGroupAnalysis.map(item => item.combination),
      datasets: [
        {
          label: 'Win Rate %',
          data: confluenceGroupAnalysis.map(item => item.winRate),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Avg P/L',
          data: confluenceGroupAnalysis.map(item => item.avgProfitLoss),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };
  }, [confluenceGroupAnalysis]);

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

  // Chart options for confluence chart with dual Y axis
  const confluenceChartOptions = {
    responsive: true,
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Win Rate & Trade Count'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Average P/L'
        }
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance by Number of Confluences',
      },
    },
  };

  // Chart options for confluence groups chart
  const confluenceGroupChartOptions = {
    responsive: true,
    indexAxis: 'y' as const, // Horizontal bar chart
    scales: {
      y: {
        type: 'category' as const,
        display: true,
        title: {
          display: true,
          text: 'Confluence Combinations'
        },
        ticks: {
          // Simple truncation of long labels
          callback: function(value: any, index: number): string {
            const labels = confluenceGroupAnalysis?.map(item => item.combination) || [];
            const label = labels[index] || '';
            return label.length > 30 ? label.substring(0, 27) + '...' : label;
          }
        }
      },
      x: {
        type: 'linear' as const,
        display: true,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'Win Rate %'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Average P/L'
        }
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance by Specific Confluence Combinations',
      },
      tooltip: {
        enabled: true,
        displayColors: true,
        callbacks: {
          title: function(tooltipItems: any[]) {
            // Display the full combination name in the tooltip
            return tooltipItems[0].label;
          }
        }
      }
    },
  };

  // Helper function to format the combination display
  const formatCombination = (combination: string) => {
    return combination
      .replace(/P:/g, 'Pivot: ')
      .replace(/B:/g, 'Banking: ')
      .replace(/M:/g, 'MA: ')
      .replace(/F:/g, 'Fib: ');
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

              {/* Number of Confluences Analysis - Full width in its own row */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Number of Confluences Analysis</h2>
                <p className="text-sm text-gray-500 mb-4">
                  This analysis tracks the performance based on the number of confluences present (pivots, banking level, MA, fib).
                </p>
                {confluenceAnalysis && confluenceAnalysis.length > 0 ? (
                  <>
                    <div className="mb-6 h-64">
                      {confluenceChartData && (
                        <Bar data={confluenceChartData} options={confluenceChartOptions} />
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confluences</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total P/L</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg P/L</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {confluenceAnalysis.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.confluenceCount} {item.confluenceCount === 1 ? 'Confluence' : 'Confluences'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.wins}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.losses}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.winRate}%</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.profitLoss.toFixed(2)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.avgProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.avgProfitLoss.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No confluence data available.</p>
                )}
              </div>

              {/* Group of Confluence Analysis - Full width in its own row */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Group of Confluence Analysis</h2>
                <p className="text-sm text-gray-500 mb-4">
                  This analysis shows which specific combinations of confluences (Pivots, Banking Level, MA, Fib) perform best.
                </p>
                {confluenceGroupAnalysis && confluenceGroupAnalysis.length > 0 ? (
                  <>
                    <div className="mb-6 h-96">
                      {confluenceGroupChartData && (
                        <Bar data={confluenceGroupChartData} options={confluenceGroupChartOptions} />
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Combination</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total P/L</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg P/L</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {confluenceGroupAnalysis.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {formatCombination(item.combination)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.wins}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.losses}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.winRate}%</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.profitLoss.toFixed(2)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.avgProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.avgProfitLoss.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No confluence group data available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 