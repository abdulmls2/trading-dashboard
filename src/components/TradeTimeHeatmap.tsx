import React, { useMemo } from 'react';
import { Trade } from '../types';

interface TradeTimeHeatmapProps {
  trades: Trade[];
}

// Trading days (Monday to Friday)
const TRADING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Time blocks (4-hour blocks starting from 6AM)
const TIME_BLOCKS = [
  { start: 6, end: 10 },
  { start: 10, end: 14 },
  { start: 14, end: 18 },
  { start: 18, end: 22 },
  { start: 22, end: 2 },  // This crosses midnight
  { start: 2, end: 6 },
];

export default function TradeTimeHeatmap({ trades }: TradeTimeHeatmapProps) {
  // Process trade data to find which blocks have trades
  const activeBlocks = useMemo(() => {
    const blocks: { day: string; timeBlock: string; pips: number }[] = [];
    
    // Process each trade
    trades.forEach(trade => {
      try {
        // Get date info
        const tradeDate = new Date(trade.date);
        const dayOfWeek = tradeDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Skip weekend trades (if any)
        if (dayOfWeek === 0 || dayOfWeek === 6) return;
        
        // Get the day name
        const dayIndex = dayOfWeek - 1;
        const dayName = TRADING_DAYS[dayIndex];
        
        // Parse time and extract hour
        const [hourStr] = trade.entryTime.split(':');
        const hour = parseInt(hourStr, 10);
        
        // Skip if we can't parse the time correctly
        if (isNaN(hour) || hour < 0 || hour > 23) return;
        
        // Find the appropriate time block, handling blocks that cross midnight
        let timeBlockIndex = -1;
        
        for (let i = 0; i < TIME_BLOCKS.length; i++) {
          const block = TIME_BLOCKS[i];
          
          if (block.start < block.end) {
            // Normal block (e.g., 6-10, 10-14, etc.)
            if (hour >= block.start && hour < block.end) {
              timeBlockIndex = i;
              break;
            }
          } else {
            // Block that crosses midnight (e.g., 22-2)
            if (hour >= block.start || hour < block.end) {
              timeBlockIndex = i;
              break;
            }
          }
        }
        
        if (timeBlockIndex === -1) return;
        
        // Extract pips from trade
        const pips = parseFloat(trade.true_tp_sl || '0');
        if (isNaN(pips)) return;
        
        // Add block to the list (using positions for grid placement)
        const blockKey = `${dayIndex}-${timeBlockIndex}`;
        
        // Check if this block is already in the list
        const existingBlockIndex = blocks.findIndex(b => b.day === dayName && b.timeBlock === blockKey);
        
        if (existingBlockIndex >= 0) {
          // Update existing block
          blocks[existingBlockIndex].pips += pips;
        } else {
          // Add new block
          blocks.push({
            day: dayName,
            timeBlock: blockKey,
            pips: pips
          });
        }
      } catch (error) {
        console.error('Error processing trade:', error);
      }
    });
    
    return blocks;
  }, [trades]);
  
  // Format time range for display
  const formatTimeRange = (start: number, end: number) => {
    const formatHour = (hour: number) => {
      // Handle hours that wrap around midnight
      const normalizedHour = hour >= 24 ? hour - 24 : (hour < 0 ? hour + 24 : hour);
      
      if (normalizedHour === 0) return '12 AM';
      if (normalizedHour === 12) return '12 PM';
      if (normalizedHour < 12) return `${normalizedHour} AM`;
      return `${normalizedHour - 12} PM`;
    };
    
    return `${formatHour(start)} - ${formatHour(end)}`;
  };
  
  // Get block color and opacity based on pips
  const getBlockStyle = (pips: number) => {
    // Normalize pips to an opacity between 0.3 and 0.9
    const absValue = Math.abs(pips);
    let opacity = 0.3;
    
    if (absValue > 0) {
      // Scale between 0.3 and 0.9 based on pip value
      opacity = Math.min(0.9, 0.3 + (absValue / 30) * 0.6);
    }
    
    // Positive pips: purple, Negative pips: red
    const bgColorClass = pips >= 0 ? 'bg-indigo-200' : 'bg-red-200';
    const textColorClass = pips >= 0 ? 'text-indigo-800' : 'text-red-800';
    
    return {
      opacity,
      bgColorClass,
      textColorClass
    };
  };
  
  // Position for grid layout
  const getGridPosition = (dayTimeKey: string) => {
    const [dayIndex, timeIndex] = dayTimeKey.split('-').map(Number);
    
    // Calculate grid positioning (row/column)
    const colStart = dayIndex + 2; // Add offset for time labels column
    const rowStart = timeIndex + 2; // Add offset for day labels row
    
    return {
      gridColumnStart: colStart,
      gridRowStart: rowStart,
    };
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Pips Time Map
      </h3>
      
      <div className="relative h-60 pb-4">
        <div className="grid grid-cols-6 grid-rows-7 h-full">
          {/* Empty cell in top-left corner */}
          <div className="col-start-1 row-start-1"></div>
          
          {/* Day headers - top row */}
          {SHORT_DAYS.map((day, index) => (
            <div 
              key={`day-${day}`} 
              className="col-start-2 row-start-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ gridColumnStart: index + 2 }}
            >
              {day}
            </div>
          ))}
          
          {/* Time labels - left column */}
          {TIME_BLOCKS.map((block, index) => (
            <div 
              key={`time-${block.start}-${block.end}`} 
              className="col-start-1 text-left text-xs text-gray-500 whitespace-nowrap"
              style={{ gridRowStart: index + 2 }}
            >
              {formatTimeRange(block.start, block.end)}
            </div>
          ))}
          
          {/* Active blocks */}
          {activeBlocks.map((block, index) => {
            const [dayIndex, timeIndex] = block.timeBlock.split('-').map(Number);
            const position = getGridPosition(block.timeBlock);
            const { opacity, bgColorClass, textColorClass } = getBlockStyle(block.pips);
            
            return (
              <div 
                key={`block-${index}`} 
                className={`rounded-lg ${bgColorClass} m-1 flex items-center justify-center`}
                style={{
                  ...position,
                  opacity: opacity
                }}
                title={`${block.day}, ${formatTimeRange(TIME_BLOCKS[timeIndex].start, TIME_BLOCKS[timeIndex].end)}
Pips: ${block.pips > 0 ? '+' : ''}${block.pips.toFixed(1)}`}
              >
                <span className={`text-xs font-medium ${textColorClass}`}>
                  {block.pips > 0 ? '+' : ''}{block.pips.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 