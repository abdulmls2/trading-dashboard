import React, { useState, useEffect, useMemo } from 'react';
import { getTrades, useEffectiveUserId } from '../lib/api';
import { Trade } from '../types';
import TradeChatBox from '../components/TradeChatBox';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
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
import { MessageSquare, X } from 'lucide-react';

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
const confluenceTypes = ['pivots', 'bankingLevel', 'ma', 'fib', 'top_bob_fv'];
const confluenceLabels = ['Pivots', 'Banking Level', 'MA', 'Fib', 'Balance Confluences'];

export default function TradesAnalysis() {
  const effectiveUserId = useEffectiveUserId();
  const { currentAccount, isLoading: accountLoading } = useAccount();
  const { user } = useAuth(); // Get actual user
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("All Trades");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeMarketCondition, setIncludeMarketCondition] = useState(false);
  const [selectedMarketCondition, setSelectedMarketCondition] = useState("All");
  const [availableMarketConditions, setAvailableMarketConditions] = useState<string[]>([]);
  // Add state for chart metric selection
  const [selectedConfluenceMetric, setSelectedConfluenceMetric] = useState<'winRate' | 'profitLoss'>('winRate');
  // Add state for chat visibility
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedAnalysisTrade, setSelectedAnalysisTrade] = useState<Trade | null>(null);
  // Add state for view modes
  const [viewModes, setViewModes] = useState({
    marketCondition: 'chart',
    dayOfWeek: 'chart',
    trend: 'chart',
    confluenceCount: 'chart',
    confluenceGroup: 'chart'
  });

  // Load trades
  useEffect(() => {
    async function loadTrades() {
      if (!effectiveUserId || !user) { // Check for user
        console.warn("No effectiveUserId or user available, cannot load trades for analysis");
        setLoading(false);
        return;
      }
      
      const isImpersonatingView = user.id !== effectiveUserId;
      const accountIdToFetch = isImpersonatingView ? null : currentAccount?.id || null;
      
      try {
        setLoading(true);
        console.log(`TradesAnalysis: Loading trades for user ${effectiveUserId} and account ${accountIdToFetch || 'all'}`);
        const data = await getTrades(effectiveUserId, accountIdToFetch);
        console.log(`TradesAnalysis: Loaded ${data.length} trades for user ${effectiveUserId} and account ${accountIdToFetch || 'all'}`);
        
        // Format the trades properly
        const formattedTrades = data.map(trade => ({
          ...trade,
          time: trade.entryTime, // Add the missing 'time' property required by Trade interface
        }));
        
        // Extract unique market conditions for the filter dropdown
        const marketConditions = new Set<string>();
        formattedTrades.forEach(trade => {
          if (trade.marketCondition && 
              trade.marketCondition !== 'None' && 
              trade.marketCondition !== 'none' && 
              trade.marketCondition !== '') {
            marketConditions.add(trade.marketCondition);
          }
        });
        
        setAvailableMarketConditions(["All", ...Array.from(marketConditions).sort()]);
        setTrades(formattedTrades);
        setFilteredTrades(formattedTrades); // Set initial filtered trades
      } catch (err) {
        console.error("Failed to load trades for analysis:", err);
        setError(err instanceof Error ? err.message : 'Failed to load trades');
      } finally {
        setLoading(false);
      }
    }

    if (effectiveUserId && !accountLoading && user) { // Check for user
      loadTrades();
    }
  }, [effectiveUserId, currentAccount, accountLoading, user]); // Add user dependency

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

    const conditions: Record<string, { total: number, wins: number, losses: number, breakeven: number, profitLoss: number }> = {};
    
    filteredTrades.forEach(trade => {
      const condition = trade.marketCondition || 'Unknown';
      
      if (!conditions[condition]) {
        conditions[condition] = { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 };
      }
      
      conditions[condition].total += 1;
      conditions[condition].profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        conditions[condition].wins += 1;
      } else if (trade.profitLoss < 0) {
        conditions[condition].losses += 1;
      } else {
        conditions[condition].breakeven += 1;
      }
    });
    
    return Object.entries(conditions).map(([condition, stats]) => ({
      condition,
      total: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      breakeven: stats.breakeven,
      winRate: (stats.total - stats.breakeven) > 0 ? Math.round((stats.wins / (stats.total - stats.breakeven)) * 100) : 0,
      profitLoss: stats.profitLoss
    }));
  }, [filteredTrades]);

  // Analyze days of the week
  const dayOfWeekAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;

    const days: Record<string, { total: number, wins: number, losses: number, breakeven: number, profitLoss: number }> = {};
    
    daysOfWeek.forEach(day => {
      days[day] = { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 };
    });
    
    filteredTrades.forEach(trade => {
      const day = trade.day || 'Unknown';
      
      if (!days[day]) {
        days[day] = { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 };
      }
      
      days[day].total += 1;
      days[day].profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        days[day].wins += 1;
      } else if (trade.profitLoss < 0) {
        days[day].losses += 1;
      } else {
        days[day].breakeven += 1;
      }
    });
    
    return Object.entries(days).map(([day, stats]) => ({
      day,
      total: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      breakeven: stats.breakeven,
      winRate: (stats.total - stats.breakeven) > 0 ? Math.round((stats.wins / (stats.total - stats.breakeven)) * 100) : 0,
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
      breakeven: 0,
      profitLoss: 0
    };

    const againstTrend = {
      label: 'Against the Trend',
      description: 'Buy + Bearish OR Sell + Bullish',
      total: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
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
      } else if (trade.profitLoss < 0) {
        target.losses += 1;
      } else {
        target.breakeven += 1;
      }
    });

    return [
      {
        ...withTrend,
        winRate: (withTrend.total - withTrend.breakeven) > 0 ? Math.round((withTrend.wins / (withTrend.total - withTrend.breakeven)) * 100) : 0
      },
      {
        ...againstTrend,
        winRate: (againstTrend.total - againstTrend.breakeven) > 0 ? Math.round((againstTrend.wins / (againstTrend.total - againstTrend.breakeven)) * 100) : 0
      }
    ];
  }, [filteredTrades]);

  // Analyze the number of confluences and their impact on trade performance
  const confluenceAnalysis = useMemo(() => {
    if (!filteredTrades.length) return null;

    // Initialize data structure to track trades by number of confluences
    const byConfluenceCount: Record<number, { total: number, wins: number, losses: number, breakeven: number, profitLoss: number }> = {
      0: { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 },
      1: { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 },
      2: { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 },
      3: { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 },
      4: { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 }
    };

    filteredTrades.forEach(trade => {
      // Count the number of confluences present in this trade
      let confluenceCount = 0;
      
      if (trade.pivots && trade.pivots !== 'None' && trade.pivots !== 'none' && trade.pivots !== '') confluenceCount++;
      if (trade.bankingLevel && trade.bankingLevel !== 'None' && trade.bankingLevel !== 'none' && trade.bankingLevel !== '') confluenceCount++;
      if (trade.ma && trade.ma !== 'None' && trade.ma !== 'none' && trade.ma !== '') confluenceCount++;
      if (trade.fib && trade.fib !== 'None' && trade.fib !== 'none' && trade.fib !== '') confluenceCount++;
      if (trade.top_bob_fv && trade.top_bob_fv !== 'None' && trade.top_bob_fv !== 'none' && trade.top_bob_fv !== '') confluenceCount++;
      
      // Add trade data to the appropriate confluence count bucket
      if (!byConfluenceCount[confluenceCount]) {
        byConfluenceCount[confluenceCount] = { total: 0, wins: 0, losses: 0, breakeven: 0, profitLoss: 0 };
      }
      
      byConfluenceCount[confluenceCount].total += 1;
      byConfluenceCount[confluenceCount].profitLoss += trade.profitLoss;
      
      if (trade.profitLoss > 0) {
        byConfluenceCount[confluenceCount].wins += 1;
      } else if (trade.profitLoss < 0) {
        byConfluenceCount[confluenceCount].losses += 1;
      } else {
        byConfluenceCount[confluenceCount].breakeven += 1;
      }
    });
    
    // Convert to array format for easier rendering
    return Object.entries(byConfluenceCount).map(([count, stats]) => ({
      confluenceCount: parseInt(count),
      total: stats.total,
      wins: stats.wins,
      losses: stats.losses,
      breakeven: stats.breakeven,
      winRate: (stats.total - stats.breakeven) > 0 ? Math.round((stats.wins / (stats.total - stats.breakeven)) * 100) : 0,
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
      breakeven: number,
      profitLoss: number,
      valueMap: Record<string, Record<string, number>>, // Track actual values
      marketCondition: string
    }> = {};
    
    // Filter trades by selected market condition if needed
    const tradesToAnalyze = selectedMarketCondition !== "All" 
      ? filteredTrades.filter(trade => trade.marketCondition === selectedMarketCondition) 
      : filteredTrades;
    
    // Analyze each trade
    tradesToAnalyze.forEach(trade => {
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
      
      if (trade.top_bob_fv && trade.top_bob_fv !== 'None' && trade.top_bob_fv !== 'none' && trade.top_bob_fv !== '') {
        activeConfluences.push('T');
        valueDetails['T'] = trade.top_bob_fv;
      }
      
      // Skip if no confluences are present
      if (activeConfluences.length === 0) return;
      
      // Add market condition if present and if user wants to include it
      const marketCondition = trade.marketCondition && 
                             trade.marketCondition !== 'None' && 
                             trade.marketCondition !== 'none' && 
                             trade.marketCondition !== '' 
                             ? trade.marketCondition : 'Unknown';
      
      // Create key with actual values and market condition if needed
      let combinationKey = activeConfluences.map(code => {
        return `${code}:${valueDetails[code]}`;
      }).join(' + ');
      
      if (includeMarketCondition) {
        combinationKey += ` (${marketCondition})`;
      }
      
      // Initialize the combination in our map if it doesn't exist
      if (!combinationPerformance[combinationKey]) {
        combinationPerformance[combinationKey] = { 
          total: 0, 
          wins: 0, 
          losses: 0,
          breakeven: 0,
          profitLoss: 0,
          valueMap: {
            'P': {}, // Pivots values
            'B': {}, // Banking Level values
            'M': {}, // MA values
            'F': {}, // Fib values
            'T': {}  // Top/Bottom of Balance (TOP/BOB) or Fair Value (FV)
          },
          marketCondition
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
      } else if (trade.profitLoss < 0) {
        combo.losses += 1;
      } else {
        combo.breakeven += 1;
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
          breakeven: stats.breakeven,
          winRate: (stats.total - stats.breakeven) > 0 ? Math.round((stats.wins / (stats.total - stats.breakeven)) * 100) : 0,
          profitLoss: stats.profitLoss,
          avgProfitLoss: stats.total > 0 ? stats.profitLoss / stats.total : 0,
          valueMap: stats.valueMap,
          marketCondition: stats.marketCondition
        };
      })
      // Sort by win rate (highest first) and then by average P/L
      .sort((a, b) => b.winRate - a.winRate || b.avgProfitLoss - a.avgProfitLoss);
    
    // Return the top combinations (if we have that many)
    return result.slice(0, 15);
  }, [filteredTrades, includeMarketCondition, selectedMarketCondition]);

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
          label: selectedConfluenceMetric === 'winRate' ? 'Win Rate %' : 'Total P/L',
          data: confluenceGroupAnalysis.map(item => selectedConfluenceMetric === 'winRate' ? item.winRate : item.profitLoss),
          backgroundColor: selectedConfluenceMetric === 'winRate' 
            ? 'rgba(75, 192, 192, 0.6)' 
            : (ctx: any) => {
                const value = ctx.raw;
                return value >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)';
              },
          borderColor: selectedConfluenceMetric === 'winRate' 
            ? 'rgba(75, 192, 192, 1)' 
            : (ctx: any) => {
                const value = ctx.raw;
                return value >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
              },
          borderWidth: 1,
        }
      ],
    };
  }, [confluenceGroupAnalysis, selectedConfluenceMetric]);

  // Helper function to format the combination display
  const formatCombination = (combination: string) => {
    // First make specific replacements for the balance confluence values
    let formatted = combination
      .replace(/T:Top of Balance \(TOP\)/g, 'T:TOB')
      .replace(/T:Bottom of Balance \(BOB\)/g, 'T:BOB')
      .replace(/T:Fair Value \(FV\)/g, 'T:FV');
    
    // Then do the general replacements
    return formatted
      .replace(/P:/g, 'Pivot: ')
      .replace(/B:/g, 'Banking: ')
      .replace(/M:/g, 'MA: ')
      .replace(/F:/g, 'Fib: ')
      .replace(/T:/g, 'Balance: ');
  };

  // Helper function to abbreviate Balance Confluence values
  const abbreviateBalanceConfluence = (value: string): string => {
    if (value.includes('Top of Balance')) return 'TOB';
    if (value.includes('Bottom of Balance')) return 'BOB';
    if (value.includes('Fair Value')) return 'FV';
    return value;
  };

  // Helper function for chart labels - uses shorter format
  const formatCombinationForChart = (combination: string) => {
    // First abbreviate balance confluence values without the T: prefix
    let formatted = combination
      .replace(/T:Top of Balance \(TOP\)/g, 'TOB')
      .replace(/T:Bottom of Balance \(BOB\)/g, 'BOB')
      .replace(/T:Fair Value \(FV\)/g, 'FV');
    
    // Then do short-form replacements for charts, but remove T: completely
    return formatted
      .replace(/P:/g, 'P:')
      .replace(/B:/g, 'B:')
      .replace(/M:/g, 'M:')
      .replace(/F:/g, 'F:')
      .replace(/T:/g, '');
  };

  // Handle market condition inclusion toggle
  const handleMarketConditionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeMarketCondition(e.target.checked);
  };

  // Handle market condition selection
  const handleMarketConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMarketCondition(e.target.value);
  };

  // Handle confluence metric change
  const handleConfluenceMetricChange = (metric: 'winRate' | 'profitLoss') => {
    setSelectedConfluenceMetric(metric);
  };

  // Toggle view mode between chart and summary
  const toggleViewMode = (section: keyof typeof viewModes) => {
    setViewModes(prev => ({
      ...prev,
      [section]: prev[section] === 'chart' ? 'summary' : 'chart'
    }));
  };

  // Generate summary for market condition
  const getMarketConditionSummary = () => {
    if (!marketConditionAnalysis) return null;
    
    // Find best and worst market conditions by win rate
    const bestByWinRate = [...marketConditionAnalysis].sort((a, b) => b.winRate - a.winRate)[0];
    const worstByWinRate = [...marketConditionAnalysis].sort((a, b) => a.winRate - b.winRate)[0];
    
    // Find best and worst market conditions by P/L
    const bestByPL = [...marketConditionAnalysis].sort((a, b) => b.profitLoss - a.profitLoss)[0];
    const worstByPL = [...marketConditionAnalysis].sort((a, b) => a.profitLoss - b.profitLoss)[0];
    
    // Find most common market condition
    const mostCommon = [...marketConditionAnalysis].sort((a, b) => b.total - a.total)[0];
    
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Key Insights:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">Best Market Condition (Win Rate):</span>{" "}
            <span className="text-green-600">{bestByWinRate.condition}</span> with {bestByWinRate.winRate}% win rate
            ({bestByWinRate.wins} wins, {bestByWinRate.losses} losses from {bestByWinRate.total} trades)
          </li>
          <li>
            <span className="font-medium">Worst Market Condition (Win Rate):</span>{" "}
            <span className="text-red-600">{worstByWinRate.condition}</span> with {worstByWinRate.winRate}% win rate
            ({worstByWinRate.wins} wins, {worstByWinRate.losses} losses from {worstByWinRate.total} trades)
          </li>
          <li>
            <span className="font-medium">Most Profitable Market Condition:</span>{" "}
            <span className="text-green-600">{bestByPL.condition}</span> with {bestByPL.profitLoss.toFixed(2)} P/L
          </li>
          <li>
            <span className="font-medium">Least Profitable Market Condition:</span>{" "}
            <span className="text-red-600">{worstByPL.condition}</span> with {worstByPL.profitLoss.toFixed(2)} P/L
          </li>
          <li>
            <span className="font-medium">Most Common Market Condition:</span>{" "}
            {mostCommon.condition} ({mostCommon.total} trades, {mostCommon.winRate}% win rate)
          </li>
        </ul>
        <p className="text-sm text-gray-600 italic mt-2">
          Recommendation: Focus on trading during {bestByWinRate.condition} market conditions and be cautious or avoid trading during {worstByWinRate.condition}.
        </p>
      </div>
    );
  };

  // Generate summary for day of week
  const getDayOfWeekSummary = () => {
    if (!dayOfWeekAnalysis) return null;
    
    // Find best and worst days by win rate
    const bestByWinRate = [...dayOfWeekAnalysis].sort((a, b) => b.winRate - a.winRate)[0];
    const worstByWinRate = [...dayOfWeekAnalysis].sort((a, b) => a.winRate - b.winRate)[0];
    
    // Find best and worst days by P/L
    const bestByPL = [...dayOfWeekAnalysis].sort((a, b) => b.profitLoss - a.profitLoss)[0];
    const worstByPL = [...dayOfWeekAnalysis].sort((a, b) => a.profitLoss - b.profitLoss)[0];
    
    // Find most active day
    const mostActive = [...dayOfWeekAnalysis].sort((a, b) => b.total - a.total)[0];
    
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Key Insights:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">Best Day (Win Rate):</span>{" "}
            <span className="text-green-600">{bestByWinRate.day}</span> with {bestByWinRate.winRate}% win rate
            ({bestByWinRate.wins} wins, {bestByWinRate.losses} losses)
          </li>
          <li>
            <span className="font-medium">Worst Day (Win Rate):</span>{" "}
            <span className="text-red-600">{worstByWinRate.day}</span> with {worstByWinRate.winRate}% win rate
            ({worstByWinRate.wins} wins, {worstByWinRate.losses} losses)
          </li>
          <li>
            <span className="font-medium">Most Profitable Day:</span>{" "}
            <span className="text-green-600">{bestByPL.day}</span> with {bestByPL.profitLoss.toFixed(2)} P/L
          </li>
          <li>
            <span className="font-medium">Least Profitable Day:</span>{" "}
            <span className="text-red-600">{worstByPL.day}</span> with {worstByPL.profitLoss.toFixed(2)} P/L
          </li>
          <li>
            <span className="font-medium">Most Active Day:</span>{" "}
            {mostActive.day} ({mostActive.total} trades, {mostActive.winRate}% win rate)
          </li>
        </ul>
        <p className="text-sm text-gray-600 italic mt-2">
          Recommendation: Consider focusing your trading on {bestByWinRate.day} and being more selective or taking smaller positions on {worstByWinRate.day}.
        </p>
      </div>
    );
  };

  // Generate summary for trend analysis
  const getTrendSummary = () => {
    if (!trendAnalysis || trendAnalysis.length < 2) return null;
    
    const withTrend = trendAnalysis[0];
    const againstTrend = trendAnalysis[1];
    
    const comparison = withTrend.winRate > againstTrend.winRate ? 
      `Trading with the trend has a ${withTrend.winRate - againstTrend.winRate}% higher win rate` :
      `Trading against the trend has a ${againstTrend.winRate - withTrend.winRate}% higher win rate`;
    
    const plComparison = withTrend.profitLoss > againstTrend.profitLoss ?
      `Trading with the trend has generated ${(withTrend.profitLoss - againstTrend.profitLoss).toFixed(2)} more in profits` :
      `Trading against the trend has generated ${(againstTrend.profitLoss - withTrend.profitLoss).toFixed(2)} more in profits`;
    
    const recommendation = withTrend.winRate > againstTrend.winRate ?
      "Continue to prioritize trades that align with the prevailing trend." :
      "Your counter-trend trading is performing well. Consider developing this strategy further.";
    
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Key Insights:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">With Trend Performance:</span>{" "}
            {withTrend.winRate}% win rate ({withTrend.wins} wins, {withTrend.losses} losses) from {withTrend.total} trades
          </li>
          <li>
            <span className="font-medium">Against Trend Performance:</span>{" "}
            {againstTrend.winRate}% win rate ({againstTrend.wins} wins, {againstTrend.losses} losses) from {againstTrend.total} trades
          </li>
          <li>
            <span className="font-medium">Comparison:</span>{" "}
            {comparison}
          </li>
          <li>
            <span className="font-medium">Profit Comparison:</span>{" "}
            {plComparison}
          </li>
        </ul>
        <p className="text-sm text-gray-600 italic mt-2">
          Recommendation: {recommendation}
        </p>
      </div>
    );
  };

  // Generate summary for confluence count
  const getConfluenceCountSummary = () => {
    if (!confluenceAnalysis) return null;
    
    // Find best and worst confluence counts by win rate
    const bestByWinRate = [...confluenceAnalysis].sort((a, b) => b.winRate - a.winRate)[0];
    const worstByWinRate = [...confluenceAnalysis].sort((a, b) => a.winRate - b.winRate)[0];
    
    // Find best and worst confluence counts by avg P/L
    const bestByAvgPL = [...confluenceAnalysis].sort((a, b) => b.avgProfitLoss - a.avgProfitLoss)[0];
    const worstByAvgPL = [...confluenceAnalysis].sort((a, b) => a.avgProfitLoss - b.avgProfitLoss)[0];
    
    // Check correlation between number of confluences and win rate
    const correlation = confluenceAnalysis.length > 1 && 
      confluenceAnalysis.every((item, i, arr) => 
        i === 0 || item.confluenceCount > arr[i-1].confluenceCount) && 
      confluenceAnalysis.every((item, i, arr) => 
        i === 0 || item.winRate >= arr[i-1].winRate) ? 
      "There's a positive correlation between the number of confluences and win rate." : 
      "There's no clear correlation between the number of confluences and win rate.";
    
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Key Insights:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">Optimal Number of Confluences (Win Rate):</span>{" "}
            <span className="text-green-600">{bestByWinRate.confluenceCount}</span> with {bestByWinRate.winRate}% win rate
          </li>
          <li>
            <span className="font-medium">Worst Number of Confluences (Win Rate):</span>{" "}
            <span className="text-red-600">{worstByWinRate.confluenceCount}</span> with {worstByWinRate.winRate}% win rate
          </li>
          <li>
            <span className="font-medium">Optimal Number of Confluences (Avg P/L):</span>{" "}
            <span className="text-green-600">{bestByAvgPL.confluenceCount}</span> with {bestByAvgPL.avgProfitLoss.toFixed(2)} avg P/L
          </li>
          <li>
            <span className="font-medium">Correlation Analysis:</span>{" "}
            {correlation}
          </li>
        </ul>
        <p className="text-sm text-gray-600 italic mt-2">
          Recommendation: Aim for {bestByWinRate.confluenceCount} confluence factors in your trading setups to maximize win rate.
        </p>
      </div>
    );
  };

  // Generate summary for confluence groups
  const getConfluenceGroupSummary = () => {
    if (!confluenceGroupAnalysis || confluenceGroupAnalysis.length === 0) return null;
    
    // Find top 3 combinations by win rate
    const topByWinRate = [...confluenceGroupAnalysis].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
    
    // Find top 3 combinations by P/L
    const topByPL = [...confluenceGroupAnalysis].sort((a, b) => b.profitLoss - a.profitLoss).slice(0, 3);
    
    // Find most common confluence combinations
    const mostCommon = [...confluenceGroupAnalysis].sort((a, b) => b.total - a.total).slice(0, 3);
    
    // Format combination strings for readability
    const formatCombinationForDisplay = (combo: string) => {
      return combo
        .replace(/P:/g, 'Pivot: ')
        .replace(/B:/g, 'Banking: ')
        .replace(/M:/g, 'MA: ')
        .replace(/F:/g, 'Fib: ')
        .replace(/T:/g, 'Balance: ')
        .split(' + ')
        .join(', ');
    };
    
    const topWinRateCombo = topByWinRate.length > 0 ? formatCombinationForDisplay(topByWinRate[0].combination) : '';
    
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Top Performing Confluence Combinations:</h3>
        <div>
          <h4 className="font-medium text-green-700">Best by Win Rate:</h4>
          <ol className="list-decimal pl-5 space-y-1">
            {topByWinRate.map((item, idx) => (
              <li key={`wr-${idx}`}>
                <span className="font-medium">{formatCombinationForDisplay(item.combination)}</span>
                <br />
                <span className="text-sm">
                  {item.winRate}% win rate ({item.wins} wins, {item.losses} losses from {item.total} trades)
                </span>
              </li>
            ))}
          </ol>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-700">Best by Total P/L:</h4>
          <ol className="list-decimal pl-5 space-y-1">
            {topByPL.map((item, idx) => (
              <li key={`pl-${idx}`}>
                <span className="font-medium">{formatCombinationForDisplay(item.combination)}</span>
                <br />
                <span className="text-sm">
                  {item.profitLoss.toFixed(2)} total P/L ({item.winRate}% win rate from {item.total} trades)
                </span>
              </li>
            ))}
          </ol>
        </div>
        
        <p className="text-sm text-gray-600 italic mt-2">
          Recommendation: Focus on trading setups that include the confluence factors from your top-performing combinations
          {topWinRateCombo ? `, particularly ${topWinRateCombo}` : ''}.
        </p>
      </div>
    );
  };

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
  const confluenceGroupChartOptions = useMemo(() => {
    return {
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
            // Use abbreviated format for chart labels
            callback: function(value: any, index: number): string {
              const labels = confluenceGroupAnalysis?.map(item => item.combination) || [];
              const label = labels[index] || '';
              return formatCombinationForChart(label);
            }
          }
        },
        x: {
          type: 'linear' as const,
          display: true,
          position: 'bottom' as const,
          title: {
            display: true,
            text: selectedConfluenceMetric === 'winRate' ? 'Win Rate %' : 'Total P/L'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: `Performance by Specific Confluence Combinations (${selectedConfluenceMetric === 'winRate' ? 'Win Rate' : 'Total P/L'})`,
        },
        tooltip: {
          enabled: true,
          displayColors: true,
          callbacks: {
            title: function(tooltipItems: any[]) {
              // Display the full combination name in the tooltip
              return formatCombination(tooltipItems[0].label);
            }
          }
        }
      },
    };
  }, [confluenceGroupAnalysis, selectedConfluenceMetric]);

  return (
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
            <button
              onClick={() => {
                // Create a virtual "analysis trade" from analytics data
                const totalTrades = filteredTrades.length;
                const totalProfitLoss = filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
                const winningTrades = filteredTrades.filter(trade => trade.profitLoss > 0).length;
                const losingTrades = filteredTrades.filter(trade => trade.profitLoss < 0).length;
                const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(2) : "0";
                
                // Get most common market conditions
                const marketConditions = filteredTrades.reduce((acc, trade) => {
                  if (trade.marketCondition) {
                    acc[trade.marketCondition] = (acc[trade.marketCondition] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>);
                
                // Find most profitable day
                const dayProfits = filteredTrades.reduce((acc, trade) => {
                  if (trade.day) {
                    acc[trade.day] = (acc[trade.day] || 0) + trade.profitLoss;
                  }
                  return acc;
                }, {} as Record<string, number>);
                
                const analysisTrade: Trade = {
                  id: 'analysis',
                  date: `${selectedMonth} ${selectedYear}`,
                  time: '',
                  pair: 'ANALYSIS',
                  action: 'Buy' as 'Buy' | 'Sell',
                  entryTime: '',
                  exitTime: '',
                  lots: 0,
                  pipStopLoss: 0,
                  pipTakeProfit: 0,
                  profitLoss: totalProfitLoss,
                  pivots: '',
                  bankingLevel: '',
                  riskRatio: 0,
                  comments: `Analysis of ${totalTrades} trades from ${selectedMonth} ${selectedYear}. Win rate: ${winRate}%. Winning trades: ${winningTrades}. Losing trades: ${losingTrades}.`,
                  day: Object.entries(dayProfits).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
                  direction: '',
                  orderType: '',
                  marketCondition: Object.entries(marketConditions).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
                  ma: '',
                  fib: '',
                  gap: '',
                  mindset: '',
                  tradeLink: '',
                  trueReward: '',
                  true_tp_sl: '',
                  additional_confluences: JSON.stringify({
                    winRate: winRate,
                    marketConditions: marketConditions,
                    dayProfits: dayProfits,
                    totalTrades: totalTrades,
                    winningTrades: winningTrades,
                    losingTrades: losingTrades
                  }),
                  top_bob_fv: '',
                };
                setSelectedAnalysisTrade(analysisTrade);
                setIsChatOpen(true);
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with AI
            </button>
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Market Condition Analysis</h2>
                  <button 
                    onClick={() => toggleViewMode('marketCondition')}
                    className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    {viewModes.marketCondition === 'chart' ? 'Show Summary' : 'Show Chart'}
                  </button>
                </div>
                {marketConditionAnalysis && marketConditionAnalysis.length > 0 ? (
                  <>
                    {viewModes.marketCondition === 'chart' ? (
                      <div className="mb-6 h-64">
                        {marketConditionChartData && (
                          <Bar data={marketConditionChartData} options={barChartOptions} />
                        )}
                      </div>
                    ) : (
                      <div className="mb-6">
                        {getMarketConditionSummary()}
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BE</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win%</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {marketConditionAnalysis.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.condition}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.total}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-green-600">{item.wins}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-red-600">{item.losses}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.breakeven}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate}%</td>
                              <td className={`px-3 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Day of Week Analysis</h2>
                  <button 
                    onClick={() => toggleViewMode('dayOfWeek')}
                    className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    {viewModes.dayOfWeek === 'chart' ? 'Show Summary' : 'Show Chart'}
                  </button>
                </div>
                {dayOfWeekAnalysis && dayOfWeekAnalysis.length > 0 ? (
                  <>
                    {viewModes.dayOfWeek === 'chart' ? (
                      <div className="mb-6 h-64">
                        {dayOfWeekChartData && (
                          <Bar data={dayOfWeekChartData} options={barChartOptions} />
                        )}
                      </div>
                    ) : (
                      <div className="mb-6">
                        {getDayOfWeekSummary()}
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BE</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win%</th>
                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dayOfWeekAnalysis.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.day}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.total}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-green-600">{item.wins}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-red-600">{item.losses}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.breakeven}</td>
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate}%</td>
                              <td className={`px-3 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Trend Analysis</h2>
                <button 
                  onClick={() => toggleViewMode('trend')}
                  className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  {viewModes.trend === 'chart' ? 'Show Summary' : 'Show Chart'}
                </button>
              </div>
              {trendAnalysis && trendAnalysis.length > 0 ? (
                <>
                  {viewModes.trend === 'chart' ? (
                    <div className="mb-6 h-64">
                      {trendChartData && (
                        <Bar data={trendChartData} options={barChartOptions} />
                      )}
                    </div>
                  ) : (
                    <div className="mb-6">
                      {getTrendSummary()}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakeven</th>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.breakeven}</td>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Number of Confluences Analysis</h2>
                <button 
                  onClick={() => toggleViewMode('confluenceCount')}
                  className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  {viewModes.confluenceCount === 'chart' ? 'Show Summary' : 'Show Chart'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                This analysis tracks the performance based on the number of confluences present (pivots, banking level, MA, fib).
              </p>
              {confluenceAnalysis && confluenceAnalysis.length > 0 ? (
                <>
                  {viewModes.confluenceCount === 'chart' ? (
                    <div className="mb-6 h-64">
                      {confluenceChartData && (
                        <Bar data={confluenceChartData} options={confluenceChartOptions} />
                      )}
                    </div>
                  ) : (
                    <div className="mb-6">
                      {getConfluenceCountSummary()}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confluences</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakeven</th>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.breakeven}</td>
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
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Group of Confluence Analysis</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-2 lg:mt-0">
                  <button 
                    onClick={() => toggleViewMode('confluenceGroup')}
                    className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    {viewModes.confluenceGroup === 'chart' ? 'Show Summary' : 'Show Chart'}
                  </button>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeMarketCondition"
                      checked={includeMarketCondition}
                      onChange={handleMarketConditionToggle}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeMarketCondition" className="ml-2 block text-sm text-gray-900">
                      Include Market Condition
                    </label>
                  </div>
                  
                  <select
                    value={selectedMarketCondition}
                    onChange={handleMarketConditionChange}
                    className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                    disabled={!includeMarketCondition}
                  >
                    {availableMarketConditions.map((condition) => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                This analysis shows which specific combinations of confluences (Pivots, Banking Level, MA, Fib) perform best.
              </p>
              
              {/* Add metric toggle buttons */}
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => handleConfluenceMetricChange('winRate')}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedConfluenceMetric === 'winRate' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Win Rate
                </button>
                <button
                  onClick={() => handleConfluenceMetricChange('profitLoss')}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedConfluenceMetric === 'profitLoss' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Total P/L
                </button>
              </div>
              
              {confluenceGroupAnalysis && confluenceGroupAnalysis.length > 0 ? (
                <>
                  {viewModes.confluenceGroup === 'chart' ? (
                    <div className="mb-6 h-96">
                      {confluenceGroupChartData && (
                        <Bar data={confluenceGroupChartData} options={confluenceGroupChartOptions} />
                      )}
                    </div>
                  ) : (
                    <div className="mb-6">
                      {getConfluenceGroupSummary()}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Combination</th>
                          {includeMarketCondition && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Condition</th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakeven</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total P/L</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg P/L</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {confluenceGroupAnalysis.map((item, index) => {
                          const displayText = formatCombination(item.combination);
                          // Extract the market condition from the parentheses at the end if present
                          const parts = displayText.split(' (');
                          const baseText = parts[0];
                          const marketCondition = item.marketCondition || "Unknown";
                          
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {baseText}
                              </td>
                              {includeMarketCondition && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {marketCondition}
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.wins}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.losses}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.breakeven}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.winRate}%</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.profitLoss.toFixed(2)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.avgProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.avgProfitLoss.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No confluence group analysis data available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}