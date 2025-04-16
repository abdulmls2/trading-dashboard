import React, { useState, useRef, useEffect } from 'react';
import { Trade, CellCustomization as CellCustomizationType, TradeViolation } from '../types';
import { ZoomIn, ZoomOut, Maximize, Minimize, Filter, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight, Palette, X, Type, AlertTriangle, ArrowUpDown, Trash2, CheckSquare, Square, Download } from 'lucide-react';
import { loadCellCustomizations, saveCellCustomization, deleteCellCustomization, getTradeViolations, deleteTrade } from '../lib/api';
import * as XLSX from 'xlsx';

interface Props {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  forcedFullScreen?: boolean;
  targetUserId?: string;
  onExitFullscreen?: () => void;
  journalOwnerName?: string;
  onDeleteTrades?: (tradeIds: string[]) => void;
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

// Format date from YYYY-MM-DD to DD-MM-YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString; // Return original if any error occurs
  }
};

// Helper function to format time for Excel
const formatTime = (timeString: string) => {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  } catch (error) {
    return timeString;
  }
};

// Helper function to prepare data for Excel export
const prepareExportData = (trades: Trade[]) => {
  // Sort trades by date (oldest to newest)
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  // Create headers with all relevant fields
  const headers = [
    ['Trade Details', '', '', '', '', '', 'Entry/Exit Details', '', '', 'Risk Management', '', '', '', 'Analysis', '', '', '', '', '', '', 'Additional Information', '', '', '', ''],
    [
      'Date',
      'Day',
      'Pair',
      'Action',
      'Direction',
      'Order Type',
      'Entry Time',
      'Exit Time',
      'Lots',
      'SL (pips)',
      'TP (pips)',
      'Risk Ratio',
      'Profit/Loss',
      'Market Condition',
      'Pivots',
      'Banking Level',
      'MA',
      'FIB',
      'Gap',
      'Additional Confluences',
      'True Reward',
      'True TP/SL',
      'Mindset',
      'Trade Link',
      'Comments'
    ]
  ];

  // Format trade data with all fields
  const data = sortedTrades.map(trade => [
    formatDate(trade.date),
    trade.day,
    trade.pair,
    trade.action,
    trade.direction,
    trade.orderType,
    formatTime(trade.entryTime),
    formatTime(trade.exitTime),
    trade.lots,
    trade.pipStopLoss,
    trade.pipTakeProfit,
    trade.riskRatio,
    trade.profitLoss,
    trade.marketCondition,
    trade.pivots,
    trade.bankingLevel,
    trade.ma,
    trade.fib,
    trade.gap,
    trade.additional_confluences,
    trade.trueReward,
    trade.true_tp_sl,
    trade.mindset,
    trade.tradeLink,
    trade.comments
  ]);

  return [...headers, ...data];
};

export default function TradeHistoryTable({
  trades,
  onSelectTrade,
  forcedFullScreen = false,
  targetUserId,
  onExitFullscreen,
  journalOwnerName,
  onDeleteTrades
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  
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
    ...(isDeleteMode ? [{ key: 'selection', display: '', fixed: true }] : []),
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
    { key: 'additional_confluences', display: 'Additional Confluences' },
    { key: 'trueReward', display: 'True Reward' },
    { key: 'true_tp_sl', display: 'True TP/SL' },
    { key: 'profitLoss', display: 'Profit/Loss' },
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
  
  // Sort trades by created_at field
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    // Handle cases where created_at might be missing
    if (!a.created_at && !b.created_at) {
      // Fall back to date field if created_at is missing for both
      return sortOrder === 'asc' 
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (!a.created_at) return sortOrder === 'asc' ? -1 : 1;
    if (!b.created_at) return sortOrder === 'asc' ? 1 : -1;
    
    // Parse dates safely
    let dateA, dateB;
    try {
      dateA = new Date(a.created_at).getTime();
      if (isNaN(dateA)) {
        dateA = new Date(a.date).getTime(); // Fallback to date field
      }
    } catch (e) {
      dateA = new Date(a.date).getTime(); // Fallback to date field
    }
    
    try {
      dateB = new Date(b.created_at).getTime();
      if (isNaN(dateB)) {
        dateB = new Date(b.date).getTime(); // Fallback to date field
      }
    } catch (e) {
      dateB = new Date(b.date).getTime(); // Fallback to date field
    }
    
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });
  
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const paginatedTrades = sortedTrades.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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

  // Update useEffect to reset page when sort order changes
  useEffect(() => {
    // Reset page when search or sort changes
    setPage(1);
  }, [searchTerm, sortOrder]);

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

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    setPage(1); // Reset to page 1 when changing sort order
  };

  // Handle row checkbox click
  const handleRowCheckboxClick = (e: React.MouseEvent, tradeId: string) => {
    e.stopPropagation(); // Prevent row selection
    
    if (selectedTradeIds.includes(tradeId)) {
      setSelectedTradeIds(selectedTradeIds.filter(id => id !== tradeId));
    } else {
      setSelectedTradeIds([...selectedTradeIds, tradeId]);
    }
  };

  // Toggle all trades selection
  const toggleSelectAllTrades = () => {
    if (selectedTradeIds.length === paginatedTrades.length) {
      // If all are selected, deselect all
      setSelectedTradeIds([]);
    } else {
      // Otherwise, select all
      setSelectedTradeIds(paginatedTrades.map(trade => trade.id));
    }
  };

  // Toggle delete mode
  const toggleDeleteMode = () => {
    // Clear selections when toggling off
    if (isDeleteMode) {
      setSelectedTradeIds([]);
    }
    setIsDeleteMode(!isDeleteMode);
  };

  // Exit delete mode
  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedTradeIds([]);
  };

  // Delete selected trades
  const handleDeleteTrades = async () => {
    if (!selectedTradeIds.length) return;
    
    setIsDeleting(true);
    try {
      // Delete each selected trade
      const deletePromises = selectedTradeIds.map(id => deleteTrade(id));
      await Promise.all(deletePromises);
      
      // Notify parent component about deletion
      if (onDeleteTrades) {
        onDeleteTrades(selectedTradeIds);
      }
      
      // Clear selection and close confirmation
      setSelectedTradeIds([]);
      setShowDeleteConfirmation(false);
      
      // Exit delete mode after successful deletion
      setIsDeleteMode(false);
    } catch (error) {
      console.error('Failed to delete trades:', error);
      // Optionally show an error message
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle export function
  const handleExport = () => {
    const exportData = prepareExportData(trades);
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trades');

    // Set column widths
    const columnWidths = [
      { wch: 8 },  // Number
      { wch: 12 }, // Date
      { wch: 10 }, // Day
      { wch: 10 }, // Pair
      { wch: 8 },  // Action
      { wch: 10 }, // Direction
      { wch: 10 }, // Entry Time
      { wch: 10 }, // Exit Time
      { wch: 8 },  // Lots
      { wch: 10 }, // SL
      { wch: 10 }, // TP
      { wch: 10 }, // Risk Ratio
      { wch: 12 }  // P/L
    ];
    ws['!cols'] = columnWidths;

    // Merge cells for the main headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },  // Trade Details
      { s: { r: 0, c: 6 }, e: { r: 0, c: 8 } },  // Entry/Exit Details
      { s: { r: 0, c: 9 }, e: { r: 0, c: 12 } }  // Risk Management
    ];

    // Apply styles to headers
    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: 'center' }
    };
    
    // Apply styles to the first two rows
    for (let i = 0; i <= 12; i++) {
      const cellRef1 = XLSX.utils.encode_cell({ r: 0, c: i });
      const cellRef2 = XLSX.utils.encode_cell({ r: 1, c: i });
      if (!ws[cellRef1]) ws[cellRef1] = { v: '', s: headerStyle };
      if (!ws[cellRef2]) ws[cellRef2] = { v: '', s: headerStyle };
      ws[cellRef1].s = headerStyle;
      ws[cellRef2].s = headerStyle;
    }

    XLSX.writeFile(wb, 'trades_export.xlsx');
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
                  {allColumns.filter(column => column.key !== 'selection').map(column => (
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
                    onClick={() => setHiddenColumns(allColumns.filter(col => !col.fixed && col.key !== 'selection').map(col => col.key))} 
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
          
          <button
            onClick={toggleSortOrder}
            className={`flex items-center space-x-1 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 ${
              sortOrder === 'desc' ? 'text-blue-600 border-blue-300' : 'text-gray-700'
            }`}
            title={`Sort by date added (${sortOrder === 'asc' ? 'oldest first' : 'newest first'})`}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            <span>Date Added {sortOrder === 'asc' ? '(Oldest)' : '(Newest)'}</span>
          </button>
          
          {journalOwnerName && (
            <div className="ml-4 px-4 py-2 bg-indigo-50 text-indigo-800 font-medium rounded-md">
              Journal of {journalOwnerName}
            </div>
          )}
          
          {isDeleteMode ? (
            <>
              {selectedTradeIds.length > 0 ? (
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="ml-4 px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded-md flex items-center transition-colors hover:bg-red-100"
                  title="Delete selected trades"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedTradeIds.length} {selectedTradeIds.length === 1 ? 'Trade' : 'Trades'}
                </button>
              ) : (
                <div className="ml-4 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-md">
                  Select trades to delete
                </div>
              )}
              <button
                onClick={exitDeleteMode}
                className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md flex items-center transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleDeleteMode}
                className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md flex items-center transition-colors hover:bg-gray-200"
                title="Enter delete mode to select trades to delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Trades
              </button>
              
              <button
                onClick={handleExport}
                className="ml-4 px-4 py-2 bg-green-50 text-green-700 border border-green-300 rounded-md flex items-center transition-colors hover:bg-green-100"
                title="Export trades to Excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </button>
            </>
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
      
      {isDeleteMode && (
        <div className="bg-yellow-50 px-4 py-2 text-sm border-b">
          <span className="flex items-center">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Mode: Select trades you want to delete
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
                    {column.key === 'selection' ? (
                      <div className="flex justify-center">
                        <button 
                          onClick={toggleSelectAllTrades}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {selectedTradeIds.length === paginatedTrades.length && paginatedTrades.length > 0 ? (
                            <CheckSquare className="h-5 w-5" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      column.display
                    )}
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
              const isSelected = selectedTradeIds.includes(trade.id);
                
              return (
                <tr 
                  key={trade.id} 
                  onClick={() => !isCustomizing && !isDeleteMode && onSelectTrade(trade)}
                  className={`${isSelected ? 'bg-blue-50' : ''} hover:bg-blue-50 transition-colors divide-x divide-gray-200 group ${isCustomizing || isDeleteMode ? 'cursor-default' : 'cursor-pointer'}`}
                  style={tradeHasViolations ? { 
                    borderLeft: '5px solid #f59e0b',
                    boxShadow: 'inset 1px 0 0 #f59e0b'
                  } : {}}
                >
                  {allColumns.map(column => {
                    if (hiddenColumns.includes(column.key)) return null;
                    
                    if (column.key === 'selection') {
                      return (
                        <td 
                          key={column.key}
                          className={`px-2 py-4 whitespace-nowrap text-sm text-gray-900 ${
                            column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center">
                            <button 
                              onClick={(e) => handleRowCheckboxClick(e, trade.id)}
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      );
                    }
                    
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
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          style={cellStyle}
                          onClick={(e) => {
                            if (isDeleteMode) {
                              handleRowCheckboxClick(e, trade.id);
                            } else if (isCustomizing) {
                              handleCellClick(e, trade.id, column.key);
                            }
                          }}
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
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          style={customization.backgroundColor ? { backgroundColor: customization.backgroundColor } : {}}
                          onClick={(e) => {
                            if (isDeleteMode) {
                              handleRowCheckboxClick(e, trade.id);
                            } else if (isCustomizing) {
                              handleCellClick(e, trade.id, column.key);
                            }
                          }}
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
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          style={cellStyle}
                          onClick={(e) => {
                            if (isDeleteMode) {
                              handleRowCheckboxClick(e, trade.id);
                            } else if (isCustomizing) {
                              handleCellClick(e, trade.id, column.key);
                            }
                          }}
                        >
                          <div className={`transition-all duration-300 ${isFullScreen ? '' : 'line-clamp-2 group-hover:line-clamp-none'}`}>
                            {trade[column.key]}
                          </div>
                        </td>
                      );
                    }
                    
                    // Special handling for date column
                    if (column.key === 'date') {
                      return (
                        <td 
                          key={column.key} 
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                            column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          style={cellStyle}
                          onClick={(e) => {
                            if (isDeleteMode) {
                              handleRowCheckboxClick(e, trade.id);
                            } else if (isCustomizing) {
                              handleCellClick(e, trade.id, column.key);
                            }
                          }}
                        >
                          {formatDate(trade.date as string)}
                        </td>
                      );
                    }
                    
                    return (
                      <td 
                        key={column.key} 
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                          column.fixed ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50' : ''
                        } ${isSelected ? 'bg-blue-50' : ''}`}
                        style={cellStyle}
                        onClick={(e) => {
                          if (isDeleteMode) {
                            handleRowCheckboxClick(e, trade.id);
                          } else if (isCustomizing) {
                            handleCellClick(e, trade.id, column.key);
                          }
                        }}
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

      {/* Confirmation modal for delete */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete {selectedTradeIds.length} {selectedTradeIds.length === 1 ? 'trade' : 'trades'}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTrades}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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