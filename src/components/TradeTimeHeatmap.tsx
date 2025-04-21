import React, { useMemo } from 'react';
import { Trade } from '../types';

interface TradeTimeHeatmapProps {
  trades: Trade[];
}

// Trading days (Monday to Friday)
const TRADING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Time blocks (4-hour blocks for simplicity)
const TIME_BLOCKS = [
  { start: 0, end: 4 },
  { start: 4, end: 8 },
  { start: 8, end: 12 },
  { start: 12, end: 16 },
  { start: 16, end: 20 },
  { start: 20, end: 24 },
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
        
        // Find the appropriate time block
        const timeBlockIndex = TIME_BLOCKS.findIndex(block => hour >= block.start && hour < block.end);
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
      if (hour === 0 || hour === 24) return '12 AM';
      if (hour === 12) return '12 PM';
      if (hour < 12) return `${hour} AM`;
      return `${hour - 12} PM`;
    };
    
    return `${formatHour(start)} - ${formatHour(end)}`;
  };
  
  // Get color based on pips (all blocks will be light purple with different opacities)
  const getBlockOpacity = (pips: number) => {
    // Normalize pips to an opacity between 0.3 and 0.9
    const absValue = Math.abs(pips);
    if (absValue === 0) return 0.3;
    
    if (absValue > 30) return 0.9;
    
    // Scale between 0.3 and 0.9
    return 0.3 + (absValue / 30) * 0.6;
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
            
            return (
              <div 
                key={`block-${index}`} 
                className="rounded-lg bg-indigo-200 m-1 flex items-center justify-center"
                style={{
                  ...position,
                  opacity: getBlockOpacity(block.pips)
                }}
                title={`${block.day}, ${formatTimeRange(TIME_BLOCKS[timeIndex].start, TIME_BLOCKS[timeIndex].end)}
Pips: ${block.pips > 0 ? '+' : ''}${block.pips.toFixed(1)}`}
              >
                <span className="text-xs font-medium text-indigo-800">
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