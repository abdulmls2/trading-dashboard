import React, { useState, useEffect, useMemo } from 'react';
import {
  getGlobalMarketConditionAnalysis,
  getGlobalDayOfWeekAnalysis,
  getGlobalTrendAnalysis,
  getGlobalConfluenceCountAnalysis,
  getGlobalConfluenceGroupAnalysis,
} from '../lib/api'; // Import new global API functions
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

// Helper function to get month index (0-11) from name or keep 'all'
const getMonthFilterValue = (monthName: string): string | number => {
  if (monthName === "All Trades") return 'all';
  const index = months.indexOf(monthName);
  return index !== -1 ? index : 'all'; // Return index (0-11) or 'all'
};

export default function GlobalTradesAnalysis() {
  // State for filters
  const [selectedMonthName, setSelectedMonthName] = useState(months[new Date().getMonth()]); // Use month name for display
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString()); // Year as string ('all' or YYYY)

  // State for analysis data
  const [marketConditionAnalysis, setMarketConditionAnalysis] = useState<any[]>([]);
  const [dayOfWeekAnalysis, setDayOfWeekAnalysis] = useState<any[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<any[]>([]);
  const [confluenceAnalysis, setConfluenceAnalysis] = useState<any[]>([]);
  const [confluenceGroupAnalysis, setConfluenceGroupAnalysis] = useState<any[]>([]);

  // State for loading and errors
  const [loading, setLoading] = useState({
    marketCondition: false,
    dayOfWeek: false,
    trend: false,
    confluenceCount: false,
    confluenceGroup: false,
  });
  const [error, setError] = useState('');

  // State for Confluence Group Analysis options
  const [includeMarketCondition, setIncludeMarketCondition] = useState(false);
  const [selectedMarketCondition, setSelectedMarketCondition] = useState("All");
  const [availableMarketConditions, setAvailableMarketConditions] = useState<string[]>(["All"]); // Needs to be populated if used
  const [selectedConfluenceMetric, setSelectedConfluenceMetric] = useState<'winRate' | 'profitLoss'>('winRate');

  // State for view modes (chart vs summary)
  const [viewModes, setViewModes] = useState({
    marketCondition: 'chart',
    dayOfWeek: 'chart',
    trend: 'chart',
    confluenceCount: 'chart',
    confluenceGroup: 'chart'
  });

  // Map selectedMonthName to the value needed by API (index or 'all')
  const monthFilter = useMemo(() => getMonthFilterValue(selectedMonthName), [selectedMonthName]);
  // Map selectedYear to the value needed by API ('all' or year string)
  const yearFilter = useMemo(() => selectedYear === "All Years" ? 'all' : selectedYear, [selectedYear]);

  // Fetch data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(prev => ({ ...prev, marketCondition: true, dayOfWeek: true, trend: true, confluenceCount: true, confluenceGroup: true }));
      setError('');

      // Convert monthFilter to string if it's a number
      const monthApiArg = typeof monthFilter === 'number' ? monthFilter.toString() : monthFilter;
      const yearApiArg = yearFilter; // Already string or 'all'

      try {
        // Fetch all analysis data concurrently
        const [
          marketData,
          dayData,
          trendData,
          confluenceCountData,
          confluenceGroupData,
        ] = await Promise.all([
          getGlobalMarketConditionAnalysis(monthApiArg, yearApiArg),
          getGlobalDayOfWeekAnalysis(monthApiArg, yearApiArg),
          getGlobalTrendAnalysis(monthApiArg, yearApiArg),
          getGlobalConfluenceCountAnalysis(monthApiArg, yearApiArg),
          getGlobalConfluenceGroupAnalysis(
            monthApiArg, // Use converted value
            yearApiArg,
            includeMarketCondition,
            selectedMarketCondition
          ),
        ]);

        setMarketConditionAnalysis(marketData || []);
        setDayOfWeekAnalysis(dayData || []);
        setTrendAnalysis(trendData || []);
        setConfluenceAnalysis(confluenceCountData || []);
        setConfluenceGroupAnalysis(confluenceGroupData || []);

         // Populate available market conditions from the fetched market data if needed
         if (marketData && marketData.length > 0) {
             const conditions = ["All", ...marketData.map((d: any) => d.condition).filter((c: string | null): c is string => c !== null && c !== 'Unknown' && c !== 'none' && c !== '').sort()];
             setAvailableMarketConditions([...new Set(conditions)]); // Use Set to remove duplicates
         } else {
             setAvailableMarketConditions(["All"]);
         }


      } catch (err) {
        console.error("Failed to load global analysis data:", err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis data');
      } finally {
         setLoading({ marketCondition: false, dayOfWeek: false, trend: false, confluenceCount: false, confluenceGroup: false });
      }
    };

    fetchData();
  }, [monthFilter, yearFilter, includeMarketCondition, selectedMarketCondition]); // Re-fetch when filters change


  // Handle month selection
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonthName(e.target.value);
  };

  // Handle year selection
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

   // --- Reusable Chart Data Generation (using fetched data) ---

  // Chart data for market conditions
  const marketConditionChartData = useMemo(() => {
    if (!marketConditionAnalysis || marketConditionAnalysis.length === 0) return null;
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
    if (!dayOfWeekAnalysis || dayOfWeekAnalysis.length === 0) return null;
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
    if (!trendAnalysis || trendAnalysis.length === 0) return null;
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
    if (!confluenceAnalysis || confluenceAnalysis.length === 0) return null;
     // Ensure data is sorted by confluenceCount for the chart
    const sortedAnalysis = [...confluenceAnalysis].sort((a, b) => a.confluenceCount - b.confluenceCount);

    return {
      labels: sortedAnalysis.map(item => `${item.confluenceCount} Confluence${item.confluenceCount !== 1 ? 's' : ''}`),
      datasets: [
        {
          label: 'Win Rate %',
          data: sortedAnalysis.map(item => item.winRate),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          type: 'bar' as const,
          yAxisID: 'y',
        },
        {
          label: 'Avg P/L',
          data: sortedAnalysis.map(item => item.avgProfitLoss),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
          type: 'line' as const, // Changed to line for better dual-axis visibility
          fill: false,
        },
        {
           label: 'Total Trades',
           data: sortedAnalysis.map(item => item.total),
           backgroundColor: 'rgba(54, 162, 235, 0.6)',
           borderColor: 'rgba(54, 162, 235, 1)',
           borderWidth: 1,
           type: 'bar' as const,
           yAxisID: 'y', // Use the primary y-axis
           order: 3 // Ensure it's behind win rate bars if needed
        }
      ],
    };
  }, [confluenceAnalysis]);

   // Chart data for confluence groups
   const confluenceGroupChartData = useMemo(() => {
     if (!confluenceGroupAnalysis || confluenceGroupAnalysis.length === 0) return null;

     // Use the analysis data directly as it should be sorted by the backend
     const analysisData = confluenceGroupAnalysis;

     return {
       labels: analysisData.map(item => item.combination), // Use raw combination for label mapping
       datasets: [
         {
           label: selectedConfluenceMetric === 'winRate' ? 'Win Rate %' : 'Total P/L',
           data: analysisData.map(item => selectedConfluenceMetric === 'winRate' ? item.winRate : item.profitLoss),
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


  // --- Reusable Helper Functions (Mostly copied from TradesAnalysis) ---

  // Helper function to format the combination display in tables/summaries
  const formatCombination = (combination: string) => {
    if (!combination) return '';
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

  // Helper function for chart labels - uses shorter format
  const formatCombinationForChart = (combination: string) => {
      if (!combination) return '';
      // First abbreviate balance confluence values without the T: prefix
      let formatted = combination
        .replace(/T:Top of Balance \(TOP\)/g, 'TOB')
        .replace(/T:Bottom of Balance \(BOB\)/g, 'BOB')
        .replace(/T:Fair Value \(FV\)/g, 'FV');

      // Then do short-form replacements for charts, but remove T: completely
      // Keep prefixes for other confluences
      return formatted
        .replace(/P:/g, 'P:')
        .replace(/B:/g, 'B:')
        .replace(/M:/g, 'M:')
        .replace(/F:/g, 'F:')
        .replace(/T:/g, ''); // Remove T: prefix entirely for Balance confluences
    };


  // Handle market condition inclusion toggle
  const handleMarketConditionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeMarketCondition(e.target.checked);
     if (!e.target.checked) {
        setSelectedMarketCondition("All"); // Reset filter if checkbox unchecked
     }
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

   // --- Reusable Summary Generation Functions (Using fetched data) ---

   // Generate summary for market condition
   const getMarketConditionSummary = () => {
     if (!marketConditionAnalysis || marketConditionAnalysis.length === 0) return null;

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
         <h3 className="text-md font-semibold">Key Insights (All Users):</h3>
         <ul className="list-disc pl-5 space-y-2">
           {bestByWinRate && <li><span className="font-medium">Best Market Condition (Win Rate):</span> <span className="text-green-600">{bestByWinRate.condition}</span> ({bestByWinRate.winRate}% WR)</li>}
           {worstByWinRate && <li><span className="font-medium">Worst Market Condition (Win Rate):</span> <span className="text-red-600">{worstByWinRate.condition}</span> ({worstByWinRate.winRate}% WR)</li>}
           {bestByPL && <li><span className="font-medium">Most Profitable Market Condition:</span> <span className="text-green-600">{bestByPL.condition}</span> (${bestByPL.profitLoss.toFixed(2)} P/L)</li>}
           {worstByPL && <li><span className="font-medium">Least Profitable Market Condition:</span> <span className="text-red-600">{worstByPL.condition}</span> (${worstByPL.profitLoss.toFixed(2)} P/L)</li>}
           {mostCommon && <li><span className="font-medium">Most Common Market Condition:</span> {mostCommon.condition} ({mostCommon.total} trades, {mostCommon.winRate}% WR)</li>}
         </ul>
       </div>
     );
   };

   // Generate summary for day of week
   const getDayOfWeekSummary = () => {
     if (!dayOfWeekAnalysis || dayOfWeekAnalysis.length === 0) return null;

     const bestByWinRate = [...dayOfWeekAnalysis].sort((a, b) => b.winRate - a.winRate)[0];
     const worstByWinRate = [...dayOfWeekAnalysis].sort((a, b) => a.winRate - b.winRate)[0];
     const bestByPL = [...dayOfWeekAnalysis].sort((a, b) => b.profitLoss - a.profitLoss)[0];
     const worstByPL = [...dayOfWeekAnalysis].sort((a, b) => a.profitLoss - b.profitLoss)[0];
     const mostActive = [...dayOfWeekAnalysis].sort((a, b) => b.total - a.total)[0];

     return (
       <div className="space-y-4">
         <h3 className="text-md font-semibold">Key Insights (All Users):</h3>
         <ul className="list-disc pl-5 space-y-2">
            {bestByWinRate && <li><span className="font-medium">Best Day (Win Rate):</span> <span className="text-green-600">{bestByWinRate.day}</span> ({bestByWinRate.winRate}% WR)</li>}
           {worstByWinRate && <li><span className="font-medium">Worst Day (Win Rate):</span> <span className="text-red-600">{worstByWinRate.day}</span> ({worstByWinRate.winRate}% WR)</li>}
           {bestByPL && <li><span className="font-medium">Most Profitable Day:</span> <span className="text-green-600">{bestByPL.day}</span> (${bestByPL.profitLoss.toFixed(2)} P/L)</li>}
           {worstByPL && <li><span className="font-medium">Least Profitable Day:</span> <span className="text-red-600">{worstByPL.day}</span> (${worstByPL.profitLoss.toFixed(2)} P/L)</li>}
           {mostActive && <li><span className="font-medium">Most Active Day:</span> {mostActive.day} ({mostActive.total} trades, {mostActive.winRate}% WR)</li>}
         </ul>
       </div>
     );
   };

    // Generate summary for trend analysis
    const getTrendSummary = () => {
      if (!trendAnalysis || trendAnalysis.length === 0) return null;

      const withTrend = trendAnalysis.find(t => t.label === 'With Trend');
      const againstTrend = trendAnalysis.find(t => t.label === 'Against Trend');

      if (!withTrend || !againstTrend) return <p>Incomplete trend data for summary.</p>;

      const comparison = withTrend.winRate > againstTrend.winRate ?
        `Trading with the trend has a ${withTrend.winRate - againstTrend.winRate}% higher win rate` :
        `Trading against the trend has a ${againstTrend.winRate - withTrend.winRate}% higher win rate`;

      const plComparison = withTrend.profitLoss > againstTrend.profitLoss ?
        `Trading with the trend generated $${(withTrend.profitLoss - againstTrend.profitLoss).toFixed(2)} more profit` :
        `Trading against the trend generated $${(againstTrend.profitLoss - withTrend.profitLoss).toFixed(2)} more profit`;

      return (
        <div className="space-y-4">
          <h3 className="text-md font-semibold">Key Insights (All Users):</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="font-medium">With Trend:</span> {withTrend.winRate}% WR ({withTrend.total} trades)</li>
            <li><span className="font-medium">Against Trend:</span> {againstTrend.winRate}% WR ({againstTrend.total} trades)</li>
            <li><span className="font-medium">Win Rate Comparison:</span> {comparison}</li>
            <li><span className="font-medium">Profit Comparison:</span> {plComparison}</li>
          </ul>
        </div>
      );
    };

  // Generate summary for confluence count
  const getConfluenceCountSummary = () => {
    if (!confluenceAnalysis || confluenceAnalysis.length === 0) return null;

    const sortedByWinRate = [...confluenceAnalysis].sort((a, b) => b.winRate - a.winRate);
    const bestByWinRate = sortedByWinRate[0];
    const worstByWinRate = sortedByWinRate[sortedByWinRate.length - 1];

    const sortedByAvgPL = [...confluenceAnalysis].sort((a, b) => b.avgProfitLoss - a.avgProfitLoss);
    const bestByAvgPL = sortedByAvgPL[0];

    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Key Insights (All Users):</h3>
        <ul className="list-disc pl-5 space-y-2">
          {bestByWinRate && <li><span className="font-medium">Optimal Confluences (Win Rate):</span> <span className="text-green-600">{bestByWinRate.confluenceCount}</span> ({bestByWinRate.winRate}% WR)</li>}
          {worstByWinRate && <li><span className="font-medium">Worst Confluences (Win Rate):</span> <span className="text-red-600">{worstByWinRate.confluenceCount}</span> ({worstByWinRate.winRate}% WR)</li>}
          {bestByAvgPL && <li><span className="font-medium">Optimal Confluences (Avg P/L):</span> <span className="text-green-600">{bestByAvgPL.confluenceCount}</span> (${bestByAvgPL.avgProfitLoss.toFixed(2)} avg P/L)</li>}
        </ul>
      </div>
    );
  };

  // Generate summary for confluence groups
  const getConfluenceGroupSummary = () => {
    if (!confluenceGroupAnalysis || confluenceGroupAnalysis.length === 0) return null;

    // Data should already be sorted by backend
    const topByWinRate = confluenceGroupAnalysis.slice(0, 3);
    const topByPL = [...confluenceGroupAnalysis].sort((a, b) => b.profitLoss - a.profitLoss).slice(0, 3);

     // Format combination strings for readability
    const formatCombinationForDisplay = (combo: string) => {
       if (!combo) return 'N/A';
       // Handle market condition suffix if present
       let baseCombo = combo;
       let marketCond = '';
       if (combo.includes(' (')) {
           const parts = combo.split(' (');
           baseCombo = parts[0];
           marketCond = ` (${parts[1]}`; // Keep the parenthesis
       }
       return formatCombination(baseCombo) + marketCond;
     };

    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Top Performing Combinations (All Users):</h3>
        <div>
          <h4 className="font-medium text-green-700">Best by Win Rate:</h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {topByWinRate.map((item, idx) => (
              <li key={`wr-${idx}`}>
                <span className="font-semibold">{formatCombinationForDisplay(item.combination)}</span>
                <span> - {item.winRate}% WR ({item.total} trades)</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="font-medium text-blue-700">Best by Total P/L:</h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {topByPL.map((item, idx) => (
              <li key={`pl-${idx}`}>
                 <span className="font-semibold">{formatCombinationForDisplay(item.combination)}</span>
                 <span> - ${item.profitLoss.toFixed(2)} P/L ({item.winRate}% WR, {item.total} trades)</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  };

  // --- Reusable Chart Options ---

  const barChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Performance by Category (All Users)' },
    },
    scales: { // Add scales for potential debugging or customization
        x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }, // Rotate labels if needed
        y: { beginAtZero: true }
    }
  }), []);

   const confluenceChartOptions = useMemo(() => ({
     responsive: true,
     maintainAspectRatio: false,
     scales: {
       y: {
         type: 'linear' as const,
         display: true,
         position: 'left' as const,
         title: { display: true, text: 'Win Rate % & Total Trades' },
         beginAtZero: true,
       },
       y1: {
         type: 'linear' as const,
         display: true,
         position: 'right' as const,
         grid: { drawOnChartArea: false },
         title: { display: true, text: 'Average P/L ($)' },
         // Suggest min/max based on data if needed, e.g.:
         // suggestedMin: Math.min(0, ...confluenceAnalysis.map(i => i.avgProfitLoss)) - 5,
         // suggestedMax: Math.max(0, ...confluenceAnalysis.map(i => i.avgProfitLoss)) + 5,
       },
       x: { // Add x-axis configuration
           title: { display: true, text: 'Number of Confluences'}
       }
     },
     plugins: {
       legend: { position: 'top' as const },
       title: { display: true, text: 'Performance by Number of Confluences (All Users)' },
       tooltip: { mode: 'index' as const, intersect: false }
     },
   }), [confluenceAnalysis]); // Add dependency


  const confluenceGroupChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const, // Horizontal bar chart
      scales: {
        y: {
          type: 'category' as const,
          display: true,
          title: { display: true, text: 'Confluence Combinations' },
          ticks: {
            // Use abbreviated format for chart labels
            callback: function(value: any, index: number): string {
              const labels = confluenceGroupAnalysis?.map(item => item.combination) || [];
              const label = labels[index] || '';
              // Handle potential undefined label
              return label ? formatCombinationForChart(label) : 'N/A';
            },
            autoSkip: false, // Prevent labels skipping
            font: { size: 10 } // Smaller font size for potentially long labels
          },
          grid: { display: false }
        },
        x: {
          type: 'linear' as const,
          display: true,
          position: 'bottom' as const,
          title: {
            display: true,
            text: selectedConfluenceMetric === 'winRate' ? 'Win Rate %' : 'Total P/L ($)'
          },
           beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false }, // Hiding legend as label describes the data
        title: {
          display: true,
          text: `Top Confluence Combinations by ${selectedConfluenceMetric === 'winRate' ? 'Win Rate' : 'Total P/L'} (All Users)`,
        },
        tooltip: {
          enabled: true,
          displayColors: true,
          callbacks: {
            title: function(tooltipItems: any[]) {
                // Map index back to the original full label from data
               const index = tooltipItems[0]?.dataIndex;
               if (index !== undefined && confluenceGroupAnalysis && confluenceGroupAnalysis[index]) {
                   const originalLabel = confluenceGroupAnalysis[index].combination;
                   // Format the full label for tooltip
                   return formatCombination(originalLabel);
               }
               return tooltipItems[0]?.label || 'N/A'; // Fallback
            },
             label: function(context: any) {
               let label = context.dataset.label || '';
               if (label) {
                 label += ': ';
               }
               if (context.parsed.x !== null) {
                 label += selectedConfluenceMetric === 'winRate'
                     ? context.parsed.x.toFixed(1) + '%'
                     : '$' + context.parsed.x.toFixed(2);
               }
               // Add total trades count to tooltip
               const index = context.dataIndex;
               if (index !== undefined && confluenceGroupAnalysis && confluenceGroupAnalysis[index]) {
                   label += ` (${confluenceGroupAnalysis[index].total} trades)`;
               }

               return label;
             }
          }
        }
      },
    };
  }, [confluenceGroupAnalysis, selectedConfluenceMetric]); // Add selectedConfluenceMetric dependency


  // --- Render Logic ---

  // Helper to render loading spinner
  const renderLoading = () => (
     <div className="flex justify-center items-center h-64">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
     </div>
   );

  // Helper to render error message
  const renderError = () => (
     <p className="text-red-500 text-center my-8">{error}</p>
   );

  // Helper to render "No Data" message
  const renderNoData = (data: any[], sectionLoading: boolean) => {
    if (sectionLoading) return renderLoading();
    if (!data || data.length === 0) return <p className="text-gray-500 text-center py-4">No data available for the selected period.</p>;
    return null;
  };

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Global Trades Analysis (All Users)</h1>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4">
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
              value={selectedMonthName}
              onChange={handleMonthChange}
              className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
            >
              <option value="All Trades">All Months</option> {/* Changed label */}
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
             {/* Removed Chat with AI button */}
          </div>
        </div>

        {error ? renderError() : (
          <div className="space-y-6">
            {/* --- Analysis Sections --- */}

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
               {renderNoData(marketConditionAnalysis, loading.marketCondition) ?? (
                 <>
                   {viewModes.marketCondition === 'chart' ? (
                     <div className="mb-6 h-96"> {/* Increased height */}
                       {marketConditionChartData && <Bar data={marketConditionChartData} options={barChartOptions} />}
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
                             <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate?.toFixed(1) ?? 'N/A'}%</td>
                             <td className={`px-3 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {item.profitLoss?.toFixed(2) ?? 'N/A'}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </>
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
               {renderNoData(dayOfWeekAnalysis, loading.dayOfWeek) ?? (
                 <>
                   {viewModes.dayOfWeek === 'chart' ? (
                     <div className="mb-6 h-96"> {/* Increased height */}
                       {dayOfWeekChartData && <Bar data={dayOfWeekChartData} options={barChartOptions} />}
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
                              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate?.toFixed(1) ?? 'N/A'}%</td>
                              <td className={`px-3 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {item.profitLoss?.toFixed(2) ?? 'N/A'}
                              </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </>
               )}
             </div>

             {/* Trend Analysis */}
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
               {renderNoData(trendAnalysis, loading.trend) ?? (
                  <>
                   {viewModes.trend === 'chart' ? (
                     <div className="mb-6 h-96"> {/* Increased height */}
                       {trendChartData && <Bar data={trendChartData} options={barChartOptions} />}
                     </div>
                   ) : (
                     <div className="mb-6">
                       {getTrendSummary()}
                     </div>
                   )}
                   <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 text-sm">
                       <thead className="bg-gray-50">
                         <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BE</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win%</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {trendAnalysis.map((item, index) => (
                           <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                             <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.label}</td>
                             <td className="px-4 py-3 whitespace-normal text-sm text-gray-500 hidden sm:table-cell">{item.description}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.total}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-green-600">{item.wins}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600">{item.losses}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.breakeven}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate?.toFixed(1) ?? 'N/A'}%</td>
                             <td className={`px-4 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {item.profitLoss?.toFixed(2) ?? 'N/A'}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </>
               )}
             </div>

             {/* Confluence Count Analysis */}
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
               {renderNoData(confluenceAnalysis, loading.confluenceCount) ?? (
                 <>
                  {viewModes.confluenceCount === 'chart' ? (
                    <div className="mb-6 h-96"> {/* Increased height */}
                      {confluenceChartData && <Chart type="bar" data={confluenceChartData} options={confluenceChartOptions} />}
                    </div>
                  ) : (
                    <div className="mb-6">
                      {getConfluenceCountSummary()}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confluences</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BE</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win%</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total P/L</th>
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg P/L</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {confluenceAnalysis.sort((a, b) => a.confluenceCount - b.confluenceCount).map((item, index) => ( // Ensure table is sorted
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                             <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                               {item.confluenceCount} {item.confluenceCount === 1 ? 'Confluence' : 'Confluences'}
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.total}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-green-600">{item.wins}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600">{item.losses}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.breakeven}</td>
                             <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate?.toFixed(1) ?? 'N/A'}%</td>
                             <td className={`px-4 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {item.profitLoss?.toFixed(2) ?? 'N/A'}
                             </td>
                              <td className={`px-4 py-3 whitespace-nowrap text-center text-sm ${item.avgProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {item.avgProfitLoss?.toFixed(2) ?? 'N/A'}
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

             {/* Confluence Group Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
                <h2 className="text-lg font-medium text-gray-900">Confluence Group Analysis</h2>
                <div className="flex flex-wrap items-center justify-start lg:justify-end gap-4">
                   <button
                     onClick={() => toggleViewMode('confluenceGroup')}
                     className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 order-1"
                   >
                     {viewModes.confluenceGroup === 'chart' ? 'Show Summary' : 'Show Chart'}
                   </button>
                  <div className="flex items-center order-2">
                    <input
                      type="checkbox"
                      id="includeMarketConditionGlobal"
                      checked={includeMarketCondition}
                      onChange={handleMarketConditionToggle}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeMarketConditionGlobal" className="ml-2 block text-sm text-gray-900">
                      Split by Market Condition
                    </label>
                  </div>
                  <select
                    value={selectedMarketCondition}
                    onChange={handleMarketConditionChange}
                    className="border border-gray-300 rounded-md shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 order-3"
                    disabled={!includeMarketCondition} // Keep disabled logic if needed for filtering
                    title={includeMarketCondition ? "Filter results by market condition" : "Enable 'Split by Market Condition' to filter"}
                  >
                    {availableMarketConditions.map((condition) => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Shows performance of specific confluence combinations. Use the checkbox to see results split by market condition.
              </p>

              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => handleConfluenceMetricChange('winRate')}
                  className={`px-3 py-1 text-sm rounded ${selectedConfluenceMetric === 'winRate' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  View by Win Rate
                </button>
                <button
                  onClick={() => handleConfluenceMetricChange('profitLoss')}
                  className={`px-3 py-1 text-sm rounded ${selectedConfluenceMetric === 'profitLoss' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  View by Total P/L
                </button>
              </div>

               {renderNoData(confluenceGroupAnalysis, loading.confluenceGroup) ?? (
                 <>
                   {viewModes.confluenceGroup === 'chart' ? (
                     <div className="mb-6 h-[600px]"> {/* Increased height significantly */}
                       {confluenceGroupChartData && <Bar data={confluenceGroupChartData} options={confluenceGroupChartOptions} />}
                     </div>
                   ) : (
                     <div className="mb-6">
                       {getConfluenceGroupSummary()}
                     </div>
                   )}
                   <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 text-sm">
                       <thead className="bg-gray-50">
                         <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Combination</th>
                            {includeMarketCondition && (
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Condition</th>
                            )}
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">BE</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win%</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total P/L</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg P/L</th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {confluenceGroupAnalysis.map((item, index) => {
                            let baseText = item.combination;
                            let marketCondition = item.marketCondition || "Unknown";
                            if (includeMarketCondition && item.combination?.includes(' (')) {
                                const parts = item.combination.split(' (');
                                baseText = parts[0];
                                // Market condition is already available separately in item.marketCondition
                            }
                           return (
                             <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                               <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-normal">
                                 {formatCombination(baseText)}
                               </td>
                               {includeMarketCondition && (
                                 <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                   {marketCondition}
                                 </td>
                               )}
                               <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.total}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-green-600">{item.wins}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600">{item.losses}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.breakeven}</td>
                               <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{item.winRate?.toFixed(1) ?? 'N/A'}%</td>
                               <td className={`px-4 py-3 whitespace-nowrap text-center text-sm ${item.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 {item.profitLoss?.toFixed(2) ?? 'N/A'}
                               </td>
                                <td className={`px-4 py-3 whitespace-nowrap text-center text-sm ${item.avgProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 {item.avgProfitLoss?.toFixed(2) ?? 'N/A'}
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 </>
               )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
} 