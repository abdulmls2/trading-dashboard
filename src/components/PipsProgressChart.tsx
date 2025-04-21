import React, { useMemo } from 'react';
import { Trade } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from 'recharts';

interface PipsProgressChartProps {
  trades: Trade[];
  monthlyPipTarget?: number;
  isAllMonthsView?: boolean;
  isAllYearsView?: boolean;
  selectedYear?: string;
}

const PipsProgressChart: React.FC<PipsProgressChartProps> = ({ 
  trades, 
  monthlyPipTarget = 0, 
  isAllMonthsView = false,
  isAllYearsView = false,
  selectedYear
}) => {
  const chartData = useMemo(() => {
    if (!trades.length) return [];

    if (isAllYearsView) {
      // Annual view for when all years and all months are selected
      const yearlyData: Record<string, {
        pips: number,
        year: number,
        tradeCount: number
      }> = {};
      
      // Sort trades by date
      const sortedTrades = [...trades].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // Group trades by year
      sortedTrades.forEach(trade => {
        const tradeDate = new Date(trade.date);
        const year = tradeDate.getFullYear();
        const yearKey = year.toString();
        
        if (!yearlyData[yearKey]) {
          yearlyData[yearKey] = {
            pips: 0,
            year,
            tradeCount: 0
          };
        }
        
        const pipValue = parseFloat(trade.true_tp_sl || '0');
        yearlyData[yearKey].pips += isNaN(pipValue) ? 0 : pipValue;
        yearlyData[yearKey].tradeCount += 1;
      });
      
      // Convert to array format for the chart
      let cumulativePips = 0;
      return Object.keys(yearlyData)
        .sort((a, b) => Number(a) - Number(b)) // Sort by year
        .map(yearKey => {
          const { year, pips, tradeCount } = yearlyData[yearKey];
          cumulativePips += pips;
          
          return {
            name: year.toString(),
            fullDate: year.toString(),
            pips: cumulativePips,
            pipChange: pips,
            tradeCount,
            year
          };
        });
    } else if (isAllMonthsView) {
      // Monthly view for when all months are selected for a specific year
      // Group trades by month and calculate cumulative pips
      const monthlyData: Record<string, {
        pips: number,
        month: number,
        monthName: string,
        trades: Trade[]
      }> = {};
      
      // Sort trades by date
      const sortedTrades = [...trades].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // Group trades by month
      sortedTrades.forEach(trade => {
        const tradeDate = new Date(trade.date);
        const month = tradeDate.getMonth();
        const monthKey = month.toString();
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            pips: 0,
            month,
            monthName: tradeDate.toLocaleString('default', { month: 'short' }),
            trades: []
          };
        }
        
        const pipValue = parseFloat(trade.true_tp_sl || '0');
        monthlyData[monthKey].pips += isNaN(pipValue) ? 0 : pipValue;
        monthlyData[monthKey].trades.push(trade);
      });
      
      // Convert to array format for the chart
      // Keep track of cumulative total
      let cumulativePips = 0;
      return Object.keys(monthlyData)
        .sort((a, b) => Number(a) - Number(b)) // Sort by month number
        .map(monthKey => {
          const { month, monthName, pips, trades } = monthlyData[monthKey];
          cumulativePips += pips;
          
          return {
            name: monthName,
            fullDate: monthName + (selectedYear ? ` ${selectedYear}` : ''),
            pips: cumulativePips,
            pipChange: pips,
            tradeCount: trades.length,
            month // Store month number for sorting
          };
        });
    } else {
      // Original daily view
      // Sort trades by date and time
      const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.entryTime}`);
        const dateB = new Date(`${b.date} ${b.entryTime}`);
        return dateA.getTime() - dateB.getTime();
      });

      let cumulativePips = 0;
      
      // Create data points for the chart
      return sortedTrades.map((trade, index) => {
        const pipValue = parseFloat(trade.true_tp_sl || '0');
        cumulativePips += isNaN(pipValue) ? 0 : pipValue;
        
        // Format date for display
        const tradeDate = new Date(trade.date);
        const day = tradeDate.getDate();
        const monthName = tradeDate.toLocaleString('default', { month: 'short' });
        
        return {
          name: `${day}`,
          fullDate: `${day} ${monthName}`,
          pips: cumulativePips,
          pipChange: pipValue,
          // Store trade details for tooltip
          tradeDetails: {
            pair: trade.pair,
            direction: trade.direction,
            pipChange: pipValue.toFixed(1),
            date: trade.date,
            time: trade.entryTime,
          }
        };
      });
    }
  }, [trades, isAllMonthsView, isAllYearsView, selectedYear]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.pipChange >= 0;
      
      if (isAllYearsView) {
        // Yearly view tooltip
        return (
          <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
            <p className="font-medium text-gray-900">{`Year ${data.fullDate}`}</p>
            <p className="font-medium text-indigo-600">{`Total Pips: ${data.pips.toFixed(1)}`}</p>
            <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {`Year: ${isPositive ? '+' : ''}${data.pipChange.toFixed(1)} pips`}
            </p>
            <p className="text-xs text-gray-500 mt-1">{`${data.tradeCount} trades`}</p>
          </div>
        );
      } else if (isAllMonthsView) {
        // Monthly view tooltip
        return (
          <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
            <p className="font-medium text-gray-900">{data.fullDate}</p>
            <p className="font-medium text-indigo-600">{`Total Pips: ${data.pips.toFixed(1)}`}</p>
            <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {`Month: ${isPositive ? '+' : ''}${data.pipChange.toFixed(1)} pips`}
            </p>
            <p className="text-xs text-gray-500 mt-1">{`${data.tradeCount} trades`}</p>
          </div>
        );
      } else {
        // Daily view tooltip (original)
        return (
          <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
            <p className="font-medium text-gray-900">{data.fullDate} {data.tradeDetails.time}</p>
            <p className="text-sm text-gray-600">{`${data.tradeDetails.pair} ${data.tradeDetails.direction}`}</p>
            <p className="font-medium text-indigo-600">{`Total Pips: ${data.pips.toFixed(1)}`}</p>
            <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {`Trade: ${isPositive ? '+' : ''}${data.tradeDetails.pipChange} pips`}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Always use blue color for the chart
  const chartColor = "#3B82F6"; // Blue color

  const hasData = chartData.length > 0;
  const finalPipsValue = hasData ? chartData[chartData.length - 1].pips : 0;

  // Determine chart title based on view
  const getChartTitle = () => {
    if (isAllYearsView) return 'Annual Pips Progress';
    if (isAllMonthsView) return `Pips Progress (${selectedYear || 'All Time'})`;
    return 'Pips Progress';
  };

  // Calculate target based on view
  const getTargetValue = () => {
    if (isAllYearsView) {
      // For annual view, multiply monthly target by 12 and by the number of years displayed
      return chartData.length > 0 ? monthlyPipTarget * 12 : 0;
    } else if (isAllMonthsView) {
      // For monthly view, multiply by 12 for annual target
      return monthlyPipTarget * 12;
    } else {
      // For daily view, use the monthly target
      return monthlyPipTarget;
    }
  };

  const targetValue = getTargetValue();
  const xAxisLabel = isAllYearsView ? 'Year' : isAllMonthsView ? 'Month' : 'Day of Month';

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {getChartTitle()}
        </h3>
        {hasData && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 mr-1"></div>
              <span className="text-sm text-gray-600">Pips</span>
            </div>
            {monthlyPipTarget > 0 && !isAllMonthsView && !isAllYearsView && (
              <div className="flex items-center">
                <div className="h-0.5 w-6 bg-teal-500 mr-1 border-dashed border-t-2 border-teal-500"></div>
                <span className="text-sm text-gray-600">Target</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="h-60">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorPips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                tickLine={{ stroke: '#E5E7EB' }}
                axisLine={{ stroke: '#E5E7EB' }}
                label={{ 
                  value: xAxisLabel, 
                  position: 'insideBottom', 
                  offset: -5, 
                  fontSize: 12 
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={{ stroke: '#E5E7EB' }}
                axisLine={{ stroke: '#E5E7EB' }}
                label={{ value: 'Pips', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1} />
              {monthlyPipTarget > 0 && !isAllMonthsView && !isAllYearsView && (
                <ReferenceLine 
                  y={targetValue} 
                  stroke="#10B981" 
                  strokeDasharray="5 5" 
                />
              )}
              <Area
                type="monotone"
                dataKey="pips"
                stroke={chartColor}
                fillOpacity={1}
                fill="url(#colorPips)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="pips"
                stroke={chartColor}
                strokeWidth={2}
                dot={{ 
                  fill: chartColor,
                  r: 4, 
                  strokeWidth: 1, 
                  stroke: "#fff" 
                }}
                activeDot={{ r: 6, fill: chartColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No trade data available for this period</p>
          </div>
        )}
      </div>
      
      {hasData && (
        <div className="mt-4 text-center">
          {isAllYearsView ? (
            <p className="text-sm text-gray-600">
              {`Total career pips: ${finalPipsValue.toFixed(1)} across ${chartData.length} years`}
            </p>
          ) : isAllMonthsView ? (
            <p className="text-sm text-gray-600">
              {`Total pips in ${selectedYear}: ${finalPipsValue.toFixed(1)} from ${
                chartData.reduce((total, item) => total + ('tradeCount' in item ? item.tradeCount : 0), 0)
              } trades`}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {finalPipsValue >= monthlyPipTarget 
                ? `🎯 Target of ${monthlyPipTarget} pips achieved! Current: ${finalPipsValue.toFixed(1)} pips`
                : `Progress: ${(finalPipsValue > 0 ? finalPipsValue.toFixed(1) : 0)} of ${monthlyPipTarget} pips (${Math.min(100, Math.max(0, (finalPipsValue / monthlyPipTarget) * 100)).toFixed(0)}%)`
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PipsProgressChart; 