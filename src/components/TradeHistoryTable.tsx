import React, { useState, useRef, useEffect } from 'react';
import { Trade, CellCustomization as CellCustomizationType, TradeViolation } from '../types';
import { ZoomIn, ZoomOut, Maximize, Minimize, Filter, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Palette, X, Type, AlertTriangle } from 'lucide-react';
import { loadCellCustomizations, saveCellCustomization, deleteCellCustomization, getTradeViolations } from '../lib/api';

interface Props {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  forcedFullScreen?: boolean;
  targetUserId?: string;
  onExitFullscreen?: () => void;
  journalOwnerName?: string;
}

// Interface for cell customization - local state
interface CellCustomization {
  tradeId: string;
  columnKey: string;
  backgroundColor: string;
  textColor: string;
}

// Formatted customizations to include userId for admins
interface FormattedCellCustomization extends CellCustomizationType {
  tradeId: string;
  columnKey: string;
  backgroundColor: string;
  textColor: string;
  userId?: string;
}

// Interface for violations data
interface ViolationData {
  id: string;
  tradeId: string;
  ruleType: string;
  violatedValue: string;
  allowedValues: string[];
  acknowledged: boolean;
}

export default function TradeHistoryTable({
  trades,
  onSelectTrade,
  forcedFullScreen = false,
  targetUserId,
  onExitFullscreen,
  journalOwnerName,
}: Props) {
  const [page, setPage] = React.useState(1);
  const [scale, setScale] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(forcedFullScreen);
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [hScrollPosition, setHScrollPosition] = useState(0);
  const [customizations, setCustomizations] = useState<FormattedCellCustomization[]>([]);
  const [isCustomizingBackground, setIsCustomizingBackground] = useState(false);
  const [isCustomizingText, setIsCustomizingText] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{tradeId: string, columnKey: string, mode: 'background' | 'text'} | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [violations, setViolations] = useState<ViolationData[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = isFullScreen || forcedFullScreen ? 30 : 10;

  // Update isFullScreen when forcedFullScreen prop changes
  useEffect(() => {
    setIsFullScreen(forcedFullScreen);
  }, [forcedFullScreen]);

  // Load saved customizations when component mounts or targetUserId changes
  useEffect(() => {
    const fetchCustomizations = async () => {
      setIsLoading(true);
      try {
        // Pass targetUserId to loadCellCustomizations if provided
        const data = await loadCellCustomizations(targetUserId);
        
        if (data && data.length > 0) {
          // Check if current user is admin (this is independent of targetUserId)
          const userIds = [...new Set(data.map((item: CellCustomizationType) => item.userId))];
          setIsAdmin(userIds.length > 1 || (data[0].userId !== undefined && data.length > 0 && !targetUserId));
          
          // Convert from API format to local format
          const formattedCustomizations: FormattedCellCustomization[] = data.map((item: CellCustomizationType) => ({
            id: item.id,
            tradeId: item.tradeId,
            columnKey: item.columnKey,
            backgroundColor: item.backgroundColor || '',
            textColor: item.textColor || '',
            userId: item.userId
          }));
          setCustomizations(formattedCustomizations);
        } else {
          // Reset customizations if no data or targetUserId changes to someone with no customizations
          setCustomizations([]);
          setIsAdmin(false); // Reset admin status if no data implies not admin or viewing specific user
        }
      } catch (error) {
        console.error('Failed to load customizations:', error);
        setCustomizations([]); // Clear customizations on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomizations();
  }, [targetUserId]);

  // Load trade violations when component mounts or targetUserId changes
  useEffect(() => {
    const fetchViolations = async () => {
      setIsLoadingViolations(true);
      try {
        const data = await getTradeViolations(targetUserId);
        if (data && data.length > 0) {
          // Format violations for easy lookup
          const formattedViolations = data.map(violation => ({
            id: violation.id,
            tradeId: violation.tradeId,
            ruleType: violation.ruleType,
            violatedValue: violation.violatedValue,
            allowedValues: violation.allowedValues,
            acknowledged: violation.acknowledged
          }));
          setViolations(formattedViolations);
        } else {
          setViolations([]);
        }
      } catch (error) {
        console.error('Failed to load violations:', error);
        setViolations([]);
      } finally {
        setIsLoadingViolations(false);
      }
    };

    fetchViolations();
  }, [targetUserId, trades]);

  // Check if a trade has violations
  const hasViolations = (tradeId: string) => {
    return violations.some(violation => violation.tradeId === tradeId);
  };
  
  // Get unacknowledged violations count for a trade
  const getUnacknowledgedViolationsCount = (tradeId: string) => {
    return violations.filter(v => v.tradeId === tradeId && !v.acknowledged).length;
  };

  // Get rule violation details for a trade (for tooltip)
  const getViolationDetails = (tradeId: string) => {
    const tradeViolations = violations.filter(v => v.tradeId === tradeId);
    if (!tradeViolations.length) return '';
    
    return tradeViolations.map(v => {
      const ruleTypeFormatted = formatRuleType(v.ruleType);
      if (v.ruleType === 'action_direction') {
        return `${ruleTypeFormatted}: Not allowed`;
      }
      return `${ruleTypeFormatted}: ${v.violatedValue} not in allowed values`;
    }).join('\n');
  };
  
  // Format rule type for display
  const formatRuleType = (type: string) => {
    switch (type) {
      case 'pair': return 'Currency Pair';
      case 'day': return 'Trading Day';
      case 'lot': return 'Lot Size';
      case 'action_direction': return 'Against Trend';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Predefined colors for quick selection
  const predefinedColors = [
    '#f3e8ff', // Light purple
    '#fae8ff', // Light pink
    '#dcfce7', // Light green
    '#e0f2fe', // Light blue
    '#ffedd5', // Light orange
    '#fee2e2', // Light red
    '#f3f4f6', // Light gray
    '#fff7ed', // Light peach
    '#f9fafb', // White
    '#fffbeb', // Light yellow
  ];

  // Predefined text colors
  const predefinedTextColors = [
    '#000000', // Black
    '#4b5563', // Gray 600
    '#1e40af', // Blue 800
    '#065f46', // Green 800
    '#9f1239', // Red 800
    '#7e22ce', // Purple 800
    '#c2410c', // Orange 700
    '#0369a1', // Sky 700
    '#a16207', // Amber 700
    '#4f46e5', // Indigo 600
  ];

  // All available columns
  const allColumns = [
    { key: 'number', display: 'Number', fixed: true },
    { key: 'date', display: 'Date', fixed: true },
    { key: 'day', display: 'Day' },
    { key: 'entryTime', display: 'Entry Time' },
    { key: 'exitTime', display: 'Exit Time' },
    { key: 'pair', display: 'Pair', fixed: true },
    { key: 'action', display: 'Action', fixed: true },
    { key: 'direction', display: 'Direction' },
    { key: 'lots', display: 'Lots' },
    { key: 'pipStopLoss', display: 'SL (pips)' },
    { key: 'pipTakeProfit', display: 'TP (pips)' },
    { key: 'riskRatio', display: 'Risk Ratio' },
    { key: 'orderType', display: 'Order Type' },
    { key: 'marketCondition', display: 'Market Condition' },
    { key: 'pivots', display: 'Pivots' },
    { key: 'bankingLevel', display: 'Banking Level' },
    { key: 'ma', display: 'MA' },
    { key: 'fib', display: 'FIB' },
    { key: 'gap', display: 'Gap' },
    { key: 'trueReward', display: 'True Reward' },
    { key: 'true_tp_sl', display: 'True TP/SL' },
    { key: 'mindset', display: 'Mindset' },
    { key: 'tradeLink', display: 'Trade Link' },
    { key: 'comments', display: 'Comments' }
  ];

  // Filter trades based on search term
  const filteredTrades = trades.filter(trade => 
    Object.values(trade).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = filteredTrades.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleZoomIn = () => setScale((prev) => prev + 0.1);
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const toggleFullScreen = () => {
    if (forcedFullScreen && onExitFullscreen) {
      // If in forced fullscreen mode and callback exists, use it
      onExitFullscreen();
      return;
    }
    
    // Regular toggle behavior for non-forced mode
    setIsFullScreen(!isFullScreen);
    if (!isFullScreen) {
      setPage(1); // Reset to page 1 when entering fullscreen mode
    }
  };
  
  const toggleBackgroundCustomization = () => {
    setIsCustomizingBackground(!isCustomizingBackground);
    setIsCustomizingText(false);
    setSelectedCell(null);
  };
  
  const toggleTextCustomization = () => {
    setIsCustomizingText(!isCustomizingText);
    setIsCustomizingBackground(false);
    setSelectedCell(null);
  };
  
  const isCustomizing = isCustomizingBackground || isCustomizingText;

  useEffect(() => {
    // Reset page when search changes
    setPage(1);
  }, [searchTerm]);

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    if (hiddenColumns.includes(columnKey)) {
      setHiddenColumns(hiddenColumns.filter(col => col !== columnKey));
    } else {
      setHiddenColumns([...hiddenColumns, columnKey]);
    }
  };

  // Handle horizontal scroll
  const scrollLeft = () => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTo({
        left: Math.max(0, hScrollPosition - 300),
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTo({
        left: hScrollPosition + 300,
        behavior: 'smooth'
      });
    }
  };

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (tableWrapperRef.current) {
        setHScrollPosition(tableWrapperRef.current.scrollLeft);
      }
    };

    const tableWrapper = tableWrapperRef.current;
    if (tableWrapper) {
      tableWrapper.addEventListener('scroll', handleScroll);
      return () => {
        tableWrapper.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Handle cell click for customization
  const handleCellClick = (e: React.MouseEvent, tradeId: string, columnKey: string) => {
    if (!isCustomizing || !isFullScreen) return;
    
    e.stopPropagation(); // Prevent row selection
    
    // If there's already a color picker open for a different cell, close it
    if (selectedCell && (selectedCell.tradeId !== tradeId || selectedCell.columnKey !== columnKey)) {
      setSelectedCell(null);
    }
    
    // Only open color picker if it's not already open for this cell
    if (!selectedCell || selectedCell.tradeId !== tradeId || selectedCell.columnKey !== columnKey) {
      // Get position for color picker
      const rect = e.currentTarget.getBoundingClientRect();
      setColorPickerPosition({
        x: rect.left,
        y: rect.bottom
      });
      
      // Set the mode based on which customization is active
      const mode = isCustomizingBackground ? 'background' : 'text';
      setSelectedCell({ tradeId, columnKey, mode });
    }
  };

  // Apply color to cell
  const applyColorToCell = async (color: string) => {
    if (!selectedCell) return;
    
    // Find existing customization for the specific user (if targetUserId is provided)
    const existingIndex = customizations.findIndex(
      c => c.tradeId === selectedCell.tradeId && 
           c.columnKey === selectedCell.columnKey &&
           (!targetUserId || c.userId === targetUserId) // Match targetUserId if provided
    );
    
    let updatedCustomizations: FormattedCellCustomization[];
    let customizationToSave: FormattedCellCustomization;
    let originalCustomizationState = [...customizations]; // For reverting

    if (existingIndex >= 0) {
      const existingCustomization = customizations[existingIndex];
      // Update existing customization
      const updatedItem: FormattedCellCustomization = {
        ...existingCustomization,
        backgroundColor: selectedCell.mode === 'background' ? color : existingCustomization.backgroundColor,
        textColor: selectedCell.mode === 'text' ? color : existingCustomization.textColor,
      };
      updatedCustomizations = [...customizations];
      updatedCustomizations[existingIndex] = updatedItem;
      customizationToSave = updatedItem;
    } else {
      // Add new customization - id will be added after saving
      const newCustomization: FormattedCellCustomization = {
        tradeId: selectedCell.tradeId,
        columnKey: selectedCell.columnKey,
        backgroundColor: selectedCell.mode === 'background' ? color : '',
        textColor: selectedCell.mode === 'text' ? color : '',
        userId: targetUserId // Ensure userId is set if admin is modifying
        // id is initially undefined
      };
      updatedCustomizations = [...customizations, newCustomization];
      customizationToSave = newCustomization;
    }
    
    // Update local state immediately for responsive UI
    setCustomizations(updatedCustomizations);
    
    // Save to database, passing targetUserId if admin is editing
    setIsSaving(true);
    try {
      const savedData = await saveCellCustomization(customizationToSave, targetUserId);
      
      // Update the local state with the id and userId returned from the API
      const finalCustomizations = updatedCustomizations.map(c => {
        if (c.tradeId === savedData.tradeId && c.columnKey === savedData.columnKey && 
            ((!c.userId && !savedData.userId) || c.userId === savedData.userId)) {
          // Match found, update with saved data (especially the id)
          return { ...c, id: savedData.id, userId: savedData.userId };
        }
        return c;
      });
      setCustomizations(finalCustomizations);
      
    } catch (error) {
      console.error('Failed to save cell customization:', error);
      // Revert local state on error
      setCustomizations(originalCustomizationState);
      // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
    }
  };

  // Close color picker
  const closeColorPicker = () => {
    setSelectedCell(null);
  };

  // Remove cell customization
  const removeCellCustomization = async () => {
    if (!selectedCell) return;
    
    // Find existing customization for the specific user
    const existingIndex = customizations.findIndex(
      c => c.tradeId === selectedCell.tradeId && 
           c.columnKey === selectedCell.columnKey &&
           (!targetUserId || c.userId === targetUserId)
    );
    
    if (existingIndex >= 0) {
      const customizationToModify = { ...customizations[existingIndex] };
      const originalCustomizationState = [...customizations]; // Keep original for revert

      // Determine if we update (remove one color) or delete (remove both/last color)
      let shouldDelete = false;
      if (selectedCell.mode === 'background') {
        customizationToModify.backgroundColor = '';
        if (!customizationToModify.textColor) {
          shouldDelete = true;
        }
      } else { // selectedCell.mode === 'text'
        customizationToModify.textColor = '';
        if (!customizationToModify.backgroundColor) {
          shouldDelete = true;
        }
      }

      setIsSaving(true);
      try {
        if (shouldDelete) {
          // Filter locally first for immediate UI feedback
          const filteredCustomizations = customizations.filter(
            (_, index) => index !== existingIndex
          );
          setCustomizations(filteredCustomizations);
          // Call delete API
          await deleteCellCustomization(selectedCell.tradeId, selectedCell.columnKey, targetUserId);
        } else {
          // Update locally first
          const updatedCustomizations = [...customizations];
          updatedCustomizations[existingIndex] = customizationToModify;
          setCustomizations(updatedCustomizations);
          // Call save API with the modified customization (which now has one color removed)
          await saveCellCustomization(customizationToModify, targetUserId);
        }
      } catch (error) {
        console.error(`Failed to ${shouldDelete ? 'delete' : 'update'} cell customization:`, error);
        // Revert local state on error
        setCustomizations(originalCustomizationState);
        // Optionally show an error message to the user
      } finally {
        setIsSaving(false);
      }
    }
    
    closeColorPicker();
  };

  // Handle document click to close color picker when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (selectedCell && tableContainerRef.current) {
        // Check if the click is outside the color picker
        const target = e.target as Node;
        const colorPicker = document.querySelector('.color-picker-container');
        if (colorPicker && !colorPicker.contains(target)) {
          closeColorPicker();
        }
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [selectedCell]);

  // Get cell customization - adjusted for targetUserId
  const getCellCustomization = (tradeId: string, columnKey: string) => {
    const customization = customizations.find(
      c => c.tradeId === tradeId && 
           c.columnKey === columnKey &&
           (!targetUserId || c.userId === targetUserId) // Find customization for the specific user being viewed
    );
    
    return {
      backgroundColor: customization?.backgroundColor || '',
      textColor: customization?.textColor || '',
    };
  };

  return (
    <div 
      className={`shadow rounded-lg flex flex-col transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}
      ref={tableContainerRef}
    >
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-t-lg border-b">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search trades..."
              className="pl-3 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowColumnSelector(!showColumnSelector)} 
              className="flex items-center space-x-1 px-3 py-2 bg-white border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              <span>Columns</span>
            </button>
            
            {showColumnSelector && (
              <div className="absolute left-0 top-full mt-2 bg-white border rounded-lg shadow-lg z-10 p-3 w-80 max-h-96 overflow-y-auto">
                <h3 className="font-medium text-sm text-gray-700 mb-2">Toggle Column Visibility</h3>
                <div className="grid grid-cols-2 gap-2">
                  {allColumns.map(column => (
                    <label key={column.key} className={`flex items-center space-x-2 cursor-pointer py-1 ${column.fixed ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(column.key)}
                        onChange={() => column.fixed ? null : toggleColumnVisibility(column.key)}
                        disabled={column.fixed}
                        className="rounded text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm">{column.display}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 border-t pt-2 flex justify-between">
                  <button 
                    onClick={() => setHiddenColumns(allColumns.filter(col => !col.fixed).map(col => col.key))} 
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Hide All
                  </button>
                  <button 
                    onClick={() => setHiddenColumns([])} 
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {journalOwnerName && (
            <div className="ml-4 px-4 py-2 bg-indigo-50 text-indigo-800 font-medium rounded-md">
              Journal of {journalOwnerName}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isFullScreen && (
            <div className="flex items-center mr-3">
              <p className="text-sm text-gray-700 mr-4">
                Page {page} of {totalPages}
              </p>
              {totalPages > 1 && (
                <div className="flex">
                  <button 
                    onClick={() => setPage(1)} 
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-sm ${page === 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-sm ${page === 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-sm ${page === totalPages ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setPage(totalPages)} 
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-sm ${page === totalPages ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {tableWrapperRef.current && tableWrapperRef.current.scrollWidth > tableWrapperRef.current.clientWidth && (
            <div className="flex items-center mr-2">
              <button onClick={scrollLeft} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" aria-label="Scroll Left">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={scrollRight} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" aria-label="Scroll Right">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <button onClick={handleZoomOut} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" aria-label="Zoom Out">
            <ZoomOut className="h-5 w-5" />
          </button>
          <button onClick={handleZoomIn} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" aria-label="Zoom In">
            <ZoomIn className="h-5 w-5" />
          </button>
          {isFullScreen && (
            <>
              <button 
                onClick={toggleBackgroundCustomization} 
                className={`p-1.5 hover:bg-gray-100 rounded ${isCustomizingBackground ? 'text-blue-500' : 'text-gray-500'}`} 
                aria-label="Customize Background Colors"
                title="Customize background colors"
              >
                <Palette className="h-5 w-5" />
              </button>
              <button 
                onClick={toggleTextCustomization} 
                className={`p-1.5 hover:bg-gray-100 rounded ${isCustomizingText ? 'text-blue-500' : 'text-gray-500'}`} 
                aria-label="Customize Text Colors"
                title="Customize text colors"
              >
                <Type className="h-5 w-5" />
              </button>
            </>
          )}
          <button onClick={toggleFullScreen} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" aria-label="Toggle Fullscreen">
            {isFullScreen || forcedFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      {isFullScreen && isCustomizing && (
        <div className="bg-blue-50 px-4 py-2 text-sm border-b">
          <span className="flex items-center">
            {isCustomizingBackground ? (
              <>
                <Palette className="h-4 w-4 mr-2" />
                Background Color Mode: Click on any cell to change its background color
              </>
            ) : (
              <>
                <Type className="h-4 w-4 mr-2" />
                Text Color Mode: Click on any cell to change its text color
              </>
            )}
          </span>
        </div>
      )}
      
      <div 
        ref={tableWrapperRef}
        className={`overflow-x-auto ${isFullScreen ? 'flex-grow h-[calc(100vh-180px)]' : 'max-h-[70vh]'}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <table 
          className="min-w-full divide-y divide-gray-200 table-fixed" 
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="divide-x divide-gray-200">
              {allColumns.map(column => 
                !hiddenColumns.includes(column.key) && (
                  <th 
                    key={column.key}
                    className={`px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                      column.fixed ? 'sticky left-0 z-20 bg-gray-50' : ''
                    }`}
                  >
                    {column.display}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTrades.map((trade, index) => {
              const tradeHasViolations = hasViolations(trade.id);
              const unacknowledgedCount = getUnacknowledgedViolationsCount(trade.id);
              const violationTitle = tradeHasViolations ? getViolationDetails(trade.id) : '';
                
              return (
                <tr 
                  key={trade.id} 
                  onClick={() => !isCustomizing && onSelectTrade(trade)}
                  className={`hover:bg-blue-50 transition-colors divide-x divide-gray-200 group ${isCustomizing ? 'cursor-default' : 'cursor-pointer'}`}
                  style={tradeHasViolations ? { 
                    borderLeft: '5px solid #f59e0b',
                    boxShadow: 'inset 1px 0 0 #f59e0b'
                  } : {}}
                >
                  {allColumns.map(column => {
                    if (hiddenColumns.includes(column.key)) return null;
                    
                    const customization = getCellCustomization(trade.id, column.key);
                    const cellStyle = {
                      ...(customization.backgroundColor ? { backgroundColor: customization.backgroundColor } : {}),
                      ...(customization.textColor ? { color: customization.textColor } : {}),
                    };
                    
                    if (column.key === 'number') {
                      return (
                        <td 
                          key={column.key} 
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                            column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                          }`}
                          style={cellStyle}
                          onClick={(e) => handleCellClick(e, trade.id, column.key)}
                        >
                          <div className="flex items-center">
                            {(page - 1) * itemsPerPage + index + 1}
                            {tradeHasViolations && (
                              <div 
                                className="ml-2 text-yellow-500"
                                title={violationTitle}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                {unacknowledgedCount > 0 && (
                                  <span className="ml-1 bg-red-500 text-white text-xs px-1 rounded-full">
                                    {unacknowledgedCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    }
                    
                    if (column.key === 'action') {
                      // Special handling for action cell with badge
                      const badgeStyle = customization.textColor ? { color: customization.textColor } : {};
                      
                      return (
                        <td 
                          key={column.key} 
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                            column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                          }`}
                          style={customization.backgroundColor ? { backgroundColor: customization.backgroundColor } : {}}
                          onClick={(e) => handleCellClick(e, trade.id, column.key)}
                        >
                          <span 
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              trade.action === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                            style={badgeStyle}
                          >
                            {trade.action}
                          </span>
                        </td>
                      );
                    }
                    
                    if (column.key === 'comments') {
                      return (
                        <td 
                          key={column.key} 
                          className={`px-6 py-4 text-sm text-gray-900 max-w-xs ${
                            column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                          }`}
                          style={cellStyle}
                          onClick={(e) => handleCellClick(e, trade.id, column.key)}
                        >
                          <div className={`transition-all duration-300 ${isFullScreen ? '' : 'line-clamp-2 group-hover:line-clamp-none'}`}>
                            {trade[column.key]}
                          </div>
                        </td>
                      );
                    }
                    
                    return (
                      <td 
                        key={column.key} 
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                          column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                        }`}
                        style={cellStyle}
                        onClick={(e) => handleCellClick(e, trade.id, column.key)}
                      >
                        {trade[column.key as keyof Trade]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paginatedTrades.length === 0 && (
              <tr>
                <td colSpan={allColumns.length - hiddenColumns.length} className="px-6 py-10 text-center text-gray-500">
                  {searchTerm ? "No trades matching your search" : "No trades available"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Color picker */}
      {isFullScreen && isCustomizing && selectedCell && (
        <div 
          className="absolute bg-white border rounded-lg shadow-lg p-3 z-50 color-picker-container"
          style={{ 
            top: colorPickerPosition.y + 'px', 
            left: colorPickerPosition.x + 'px',
          }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">
              {selectedCell.mode === 'background' ? 'Select Background Color' : 'Select Text Color'}
            </h3>
            <button onClick={closeColorPicker} className="text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {(selectedCell.mode === 'background' ? predefinedColors : predefinedTextColors).map((color, index) => (
              <button
                key={index}
                className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  applyColorToCell(color);
                  closeColorPicker();
                }}
                aria-label={`Color ${index + 1}`}
              />
            ))}
          </div>
          <input 
            type="color" 
            className="w-full h-8 cursor-pointer mb-2"
            defaultValue={selectedCell.mode === 'background' ? '#e0f2fe' : '#000000'}
            onChange={(e) => applyColorToCell(e.target.value)}
          />
          <button 
            onClick={removeCellCustomization}
            className="w-full text-xs text-red-500 hover:text-red-700"
          >
            Reset {selectedCell.mode === 'background' ? 'Background' : 'Text'} Color
          </button>
        </div>
      )}

      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-b-lg">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          {!isFullScreen && (
            <div>
              <p className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </p>
            </div>
          )}
          {totalPages > 1 && !isFullScreen && (
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {(() => {
                  // Calculate how many page buttons to show based on screen mode
                  const maxButtons = isFullScreen ? 30 : 10;
                  const buttons = [];
                  
                  let startPage = 1;
                  let endPage = totalPages;
                  
                  if (totalPages > maxButtons) {
                    // Calculate which pages to show
                    const halfVisiblePages = Math.floor(maxButtons / 2);
                    
                    if (page <= halfVisiblePages) {
                      // Near the start
                      endPage = maxButtons;
                    } else if (page >= totalPages - halfVisiblePages) {
                      // Near the end
                      startPage = totalPages - maxButtons + 1;
                    } else {
                      // Middle
                      startPage = page - halfVisiblePages;
                      endPage = page + halfVisiblePages;
                    }
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    buttons.push(
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                          page === i
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  return buttons;
                })()}
              </nav>
            </div>
          )}
        </div>
        
        <div className="flex-1 flex justify-between sm:hidden">
          {!isFullScreen && (
            <>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <select
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
                className="ml-2 block w-24 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                {[...Array(totalPages)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center">
          <div className="animate-pulse text-blue-500">Loading customizations...</div>
        </div>
      )}
      
      {isSaving && (
        <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm z-50">
          Saving...
        </div>
      )}
    </div>
  );
}