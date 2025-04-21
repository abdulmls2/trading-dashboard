import React, { useMemo } from 'react';
import { Trade } from '../types';

interface PairDistributionChartProps {
  trades: Trade[];
}

// Define colors based on the sidebar's indigo theme
const CHART_COLORS = [
  '#4F46E5', // indigo-600
  '#7C3AED', // violet-600
  '#0891B2', // cyan-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#DC2626', // red-600
  '#9333EA', // purple-600
  '#0EA5E9', // sky-600
];

// Helper function to determine text color based on background
const getTextColor = (bgColor: string): string => {
  // Basic check: if the color is very light, use dark text, otherwise white
  // This is a simplified check; a more robust one would analyze RGB values
  const lightColors = ['rgb(199, 210, 254)', 'rgb(224, 231, 255)', 'rgb(238, 242, 255)'];
  return lightColors.includes(bgColor) ? '#1f2937' : '#ffffff'; // Dark gray or white
};

export default function PairDistributionChart({ trades }: PairDistributionChartProps) {
  // Calculate distribution of trades by pair
  const pairDistribution = useMemo(() => {
    if (!trades.length) return [];
    
    // Count occurrences of each pair
    const pairCounts: Record<string, number> = {};
    trades.forEach((trade) => {
      const pair = trade.pair || 'Unknown';
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    });
    
    // Convert to array and sort by count (descending)
    let pairsArray = Object.entries(pairCounts)
      .map(([pair, count]) => ({
        pair,
        count,
        percentage: (count / trades.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    // Take top 5 pairs, and group the rest as "Others"
    if (pairsArray.length > 6) {
      const topPairs = pairsArray.slice(0, 5);
      const otherPairs = pairsArray.slice(5);
      const otherCount = otherPairs.reduce((sum, item) => sum + item.count, 0);
      const otherPercentage = (otherCount / trades.length) * 100;
      
      pairsArray = [
        ...topPairs,
        { pair: 'Others', count: otherCount, percentage: otherPercentage }
      ];
    }
    
    // Assign colors to each segment
    return pairsArray.map((item, index) => ({
      ...item,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [trades]);

  // SVG dimensions
  const size = 220;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.6; // Donut hole size
  const labelRadius = innerRadius + (outerRadius - innerRadius) / 2; // Radius for placing labels within segments

  // Generate SVG paths for donut segments and labels
  const generateDonutSegmentsAndLabels = () => {
    if (!pairDistribution.length) {
      // If no data, return a gray empty circle
      return (
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={outerRadius} 
          fill="none" 
          stroke="#e5e7eb"
          strokeWidth={outerRadius - innerRadius} 
        />
      );
    }
    
    // Special case for when there's only one pair (100%)
    if (pairDistribution.length === 1) {
      return (
        <>
          {/* Complete donut circle for 100% case */}
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={(outerRadius + innerRadius) / 2} 
            fill="none" 
            stroke={pairDistribution[0].color}
            strokeWidth={outerRadius - innerRadius}
          />
          
          {/* Add percentage label on the donut */}
          <text
            x={centerX}
            y={centerY - labelRadius} // Position at the top of the donut
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="medium"
            fill="#ffffff"
          >
            {Math.round(pairDistribution[0].percentage)}%
          </text>
        </>
      );
    }
    
    // Calculate paths for each segment
    let startAngle = 0;
    const segments: React.ReactElement[] = [];
    const labels: React.ReactElement[] = [];

    pairDistribution.forEach((item, index) => {
      const angle = (item.percentage / 100) * 360;
      const endAngle = startAngle + angle;
      
      // Don't render segments for 0% values to avoid rendering issues
      if (angle <= 0) {
        startAngle = endAngle;
        return;
      }

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);
      
      const x1 = centerX + innerRadius * Math.cos(startRad);
      const y1 = centerY + innerRadius * Math.sin(startRad);
      const x2 = centerX + outerRadius * Math.cos(startRad);
      const y2 = centerY + outerRadius * Math.sin(startRad);
      const x3 = centerX + outerRadius * Math.cos(endRad);
      const y3 = centerY + outerRadius * Math.sin(endRad);
      const x4 = centerX + innerRadius * Math.cos(endRad);
      const y4 = centerY + innerRadius * Math.sin(endRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const path = [
        `M ${x1},${y1}`,
        `L ${x2},${y2}`,
        `A ${outerRadius},${outerRadius} 0 ${largeArcFlag},1 ${x3},${y3}`,
        `L ${x4},${y4}`,
        `A ${innerRadius},${innerRadius} 0 ${largeArcFlag},0 ${x1},${y1}`,
        'Z'
      ].join(' ');

      segments.push(
        <path
          key={`segment-${index}`}
          d={path}
          fill={item.color}
          stroke="#fff"
          strokeWidth={1}
        />
      );

      // Add percentage label if the segment is large enough
      if (item.percentage >= 5) {
        const midAngle = startAngle + angle / 2;
        const midRad = (midAngle - 90) * (Math.PI / 180);
        const labelX = centerX + labelRadius * Math.cos(midRad);
        const labelY = centerY + labelRadius * Math.sin(midRad);
        
        labels.push(
          <text
            key={`label-${index}`}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="medium"
            fill={getTextColor(item.color)}
            style={{ pointerEvents: 'none' }}
          >
            {Math.round(item.percentage)}%
          </text>
        );
      }
      
      startAngle = endAngle;
    });

    // Return segments first, then labels on top
    return [...segments, ...labels];
  };
  
  // Text label in the center of the donut
  const centerLabel = () => {
    if (pairDistribution.length === 0) {
      return (
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-gray-400 text-sm font-medium"
        >
          No data
        </text>
      );
    }
    
    // For single pair, still show the pair name in the center
    const topPair = pairDistribution[0];
    return (
      <>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-500 text-xs uppercase tracking-wider"
        >
          {topPair.pair}
        </text>
      </>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Most Used Pairs</h3>
      
      <div className="flex flex-col items-center md:flex-row md:items-start md:justify-around">
        {/* Donut Chart */}
        <div className="relative w-[220px] h-[220px] mb-4 md:mb-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {generateDonutSegmentsAndLabels()}
            {centerLabel()}
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex flex-col space-y-2">
          {pairDistribution.length > 0 ? (
            pairDistribution.map((item, index) => (
              <div key={`legend-${index}`} className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">{item.pair}</span>
                  <span className="text-xs text-gray-500">{Math.round(item.percentage)}%</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No trades recorded</div>
          )}
        </div>
      </div>
    </div>
  );
}