import React, { useState, useEffect, useRef } from 'react';
import { Trade } from '../types';
import { createTrade, updateTrade, checkTradeAgainstRules, createTradeViolation, getUserTradingRules } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { Clipboard, AlertTriangle, Upload, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

// Make the Trade interface work with both create and update operations
interface TradeFormData extends Omit<Trade, 'id' | 'top_bob_fv' | 'drawdown'> {
  id?: string;
  top_bob_fv?: string;
  drawdown?: number;
}

const currencyPairs = [
  'GBP/USD',
  'EUR/USD',
  'GBP/JPY',
  'GBP/AUD',
  'XAU/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
];

const tradingDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const directionOptions = [
  'Bullish',
  'Bearish'
];

const orderTypeOptions = [
  'Execution',
  'Limit'
];

const marketConditionOptions = [
  'Balanced',
  'Imbalanced'
];

const maOptions = [
  '50 MA',
  '200 MA'
];

const fibOptions = [
  '23.6',
  '38.2',
  '50',
  '61.8',
  '78.6'
];

const gapOptions = [
  'Index Gap',
  'Currency Gap'
];

const balanceConfluenceOptions = [
  'Top of Balance (TOP)',
  'Bottom of Balance (BOB)',
  'Fair Value (FV)'
];

interface Props {
  onClose: () => void;
  existingTrade?: Trade;
  readOnly?: boolean;
  targetUserId?: string;
}

type TabType = 'basic' | 'technical' | 'analysis' | 'result' | 'notes' | 'import';

export default function TradeForm({ onClose, existingTrade, readOnly = false, targetUserId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [profitLossInput, setProfitLossInput] = useState<string>(
    // Initialize with existing trade value or empty string for new trades
    existingTrade ? existingTrade.profitLoss.toString() : ''
  );
  const [formData, setFormData] = React.useState<TradeFormData>(
    existingTrade || {
      date: '', // Empty field for date
      pair: 'GBP/USD',
      action: 'Buy',
      entryTime: '', // Empty field for entry time
      exitTime: '',
      lots: 0.01,
      pipStopLoss: 15,
      pipTakeProfit: 75,
      profitLoss: 0,
      drawdown: undefined,
      pivots: '',
      bankingLevel: '',
      riskRatio: 5,
      comments: '',
      day: '', // Empty field for day
      direction: directionOptions[0],
      orderType: '',
      marketCondition: '',
      ma: '',
      fib: '',
      gap: '',
      mindset: '',
      tradeLink: '',
      trueReward: '',
      true_tp_sl: '',
      additional_confluences: '',
      time: '',
      top_bob_fv: '',
    }
  );

  // State for current time
  const [dateTime, setDateTime] = useState(new Date());

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Format date and time for display and for use in other parts of the app
  const dayOfWeek = dateTime.toLocaleDateString(undefined, {
    weekday: 'long'
  });
  
  const formattedDate = dateTime.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = dateTime.toLocaleTimeString();
  
  // Get timezone information
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneOffset = dateTime.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(timezoneOffset / 60));
  const offsetMinutes = Math.abs(timezoneOffset % 60);
  const offsetFormatted = `${timezoneOffset <= 0 ? '+' : '-'}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
  
  // Create reusable date and time information objects
  const dateInfo = {
    raw: dateTime,
    day: dayOfWeek,
    date: formattedDate,
    time: formattedTime,
    timezone: timezone,
    offset: offsetFormatted,
    iso: dateTime.toISOString(),
    // Format as YYYY-MM-DD for database storage and date input using LOCAL timezone
    dbDate: `${dateTime.getFullYear()}-${String(dateTime.getMonth() + 1).padStart(2, '0')}-${String(dateTime.getDate()).padStart(2, '0')}`,
    // Display format DD/MM/YYYY for UI consistency using LOCAL timezone
    displayDate: `${String(dateTime.getDate()).padStart(2, '0')}/${String(dateTime.getMonth() + 1).padStart(2, '0')}/${dateTime.getFullYear()}`,
    // Format as HH:MM for time input
    dbTime: dateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    timestamp: dateTime.getTime()
  };
  
  // Auto-populate date, day, and time fields when form is opened for new trades
  useEffect(() => {
    // Only auto-populate for new trades (not when editing existing ones)
    if (!existingTrade && !readOnly) {
      // console.log('Auto-populating date and time for new trade');
      
      setFormData(prevData => ({
        ...prevData,
        date: dateInfo.dbDate,           // YYYY-MM-DD format
        day: dateInfo.day,               // Full day name
        entryTime: dateInfo.dbTime,      // HH:MM format
        time: dateInfo.dbTime            // Also set the time field
      }));
    }
  }, []);  // Empty dependency array ensures this runs only once when the component mounts
  
  // Log the date information whenever it changes (every second)
  useEffect(() => {
    /* 
    console.log('Current date/time information:', dateInfo);
    console.log('Date formats for debugging:');
    console.log('- ISO (UTC):', dateInfo.iso);
    console.log('- DB Date (YYYY-MM-DD in LOCAL timezone):', dateInfo.dbDate);
    console.log('- Display Date (DD/MM/YYYY in LOCAL timezone):', dateInfo.displayDate);
    console.log('- Local Date Components:', {
      year: dateTime.getFullYear(),
      month: dateTime.getMonth() + 1, // 0-indexed, so +1
      day: dateTime.getDate(),
      hours: dateTime.getHours(),
      minutes: dateTime.getMinutes()
    });
    */
  }, [dateTime]);
  
  // Function to use the date information in other parts of the app
  const populateCurrentDateTime = () => {
    // Use the YYYY-MM-DD format for the date input field (standard HTML date input format)
    const formattedDateForInput = dateInfo.dbDate;
    // console.log('Setting date to (YYYY-MM-DD):', formattedDateForInput);
    
    // Format the time as HH:MM for the time input field
    const formattedTimeForInput = dateInfo.dbTime;
    // console.log('Setting time to:', formattedTimeForInput);
    
    setFormData(prevData => ({
      ...prevData,
      date: formattedDateForInput,
      day: dayOfWeek,
      entryTime: formattedTimeForInput,
      time: formattedTimeForInput
    }));
  };

  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [ruleViolations, setRuleViolations] = useState<Array<{
    ruleType: string;
    violatedValue: string;
    allowedValues: string[];
  }>>([]);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [acknowledgedViolations, setAcknowledgedViolations] = useState(false);
  const [hasAgainstTrendRule, setHasAgainstTrendRule] = useState(false);

  // New state for import
  const [importData, setImportData] = useState('');
  const [importPreview, setImportPreview] = useState<TradeFormData | null>(null);
  const [multipleTradesPreview, setMultipleTradesPreview] = useState<TradeFormData[]>([]);
  const [importError, setImportError] = useState('');
  const [isMultipleImport, setIsMultipleImport] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  // State to track which trades have violations
  const [tradesWithViolations, setTradesWithViolations] = useState<Set<number>>(new Set());
  
  // File upload ref and state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);

  // Check for rule violations when key fields change
  useEffect(() => {
    const checkRules = async () => {
      // Make sure we have either a user or a targetUserId
      if (!user && !targetUserId) return;

      try {
        // Only check these specific fields for rule violations
        const partialTrade = {
          pair: formData.pair,
          day: formData.day,
          lots: formData.lots,
          action: formData.action,
          direction: formData.direction
        };

        console.log('Checking trade against rules:', partialTrade);
        const result = await checkTradeAgainstRules(partialTrade, targetUserId || user!.id);
        console.log('Rule check result:', result);
        
        if (!result.isValid) {
          setRuleViolations(result.violations);
          // Only show the warning if we have violations and user has not acknowledged them yet
          setShowViolationWarning(!acknowledgedViolations && result.violations.length > 0);
        } else {
          setRuleViolations([]);
          setShowViolationWarning(false);
        }
      } catch (err) {
        console.error('Error checking rules:', err);
      }
    };

    // Don't check in read-only mode
    if (!readOnly) {
      checkRules();
    }
  }, [formData.pair, formData.day, formData.lots, formData.action, formData.direction, user, readOnly, acknowledgedViolations]);

  // Check if user has the against trend rule
  useEffect(() => {
    const checkAgainstTrendRule = async () => {
      if (!user && !targetUserId) return;
      
      try {
        // Get the user ID to use
        const userId = targetUserId || (user ? user.id : null);
        if (!userId) return;
        
        console.log('Checking against trend rule for user:', userId);
        const rules = await getUserTradingRules(userId);
        console.log('User trading rules:', rules);
        
        const againstTrendRule = rules.find(r => r.ruleType === 'action_direction');
        console.log('Found action_direction rule:', againstTrendRule);
        
        const ruleStatus = !!againstTrendRule && againstTrendRule.allowedValues.includes('No');
        console.log('Has against trend rule set to No:', ruleStatus);
        
        setHasAgainstTrendRule(ruleStatus);
      } catch (err) {
        console.error('Error checking against trend rule:', err);
      }
    };
    
    checkAgainstTrendRule();
  }, [user, targetUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return; // Prevent multiple submissions
    
    // Validate form fields (This could be expanded)
    if (!formData.date || !formData.pair || !formData.entryTime) {
      setError('Please fill in all required fields.');
      return;
    }
    
    // Ensure date is in the correct format (YYYY-MM-DD) for database storage
    let validatedFormData = { 
      ...formData,
      date: formatDateForDB(formData.date)
    };
    
    console.log('Original date:', formData.date);
    console.log('Formatted date for DB:', validatedFormData.date);
    
    // Log form data before submission for debugging
    console.log('Submitting form data:', validatedFormData);
    
    // Check for rule violations if any exist and user hasn't acknowledged them
    if (ruleViolations.length > 0 && !acknowledgedViolations) {
      setShowViolationWarning(true);
      return;
    }

    try {
      setLoading(true);
      
      // Calculate true P/L in pips
      const updatedFormData = {
        ...validatedFormData,
        profitLoss: parseFloat(profitLossInput) || formData.profitLoss, // Use the input if parsed successfully
      };
      
      // Log the final data being sent to the database
      console.log('Final data for database:', updatedFormData);
      
      if (existingTrade) {
        // Updating an existing trade
        await updateTrade(existingTrade.id, updatedFormData);
      } else {
        // Creating a new trade
        // Use the currentAccount.id when creating the trade
        const newTrade = await createTrade(updatedFormData, targetUserId, currentAccount?.id || null);
        
        // If there are rule violations and we've gotten here, the user has acknowledged them
        // Let's record these violations
        if (ruleViolations.length > 0) {
          for (const violation of ruleViolations) {
            await createTradeViolation({
              tradeId: newTrade.id,
              userId: targetUserId || user?.id || '',
              ruleType: violation.ruleType as "pair" | "day" | "lot" | "action_direction",
              violatedValue: violation.violatedValue,
              allowedValues: violation.allowedValues,
              acknowledged: true
            });
          }
        }
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving trade:', err);
      setError('Failed to save trade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      date: '', // Empty field for date
      pair: 'EUR/USD',
      action: 'Buy',
      entryTime: '', // Empty field for entry time
      exitTime: '',
      lots: 0.01,
      pipStopLoss: 15,
      pipTakeProfit: 75,
      profitLoss: 0,
      drawdown: undefined,
      pivots: '',
      bankingLevel: '',
      riskRatio: 5,
      comments: '',
      day: '', // Empty field for day
      direction: directionOptions[0],
      orderType: '',
      marketCondition: '',
      ma: '',
      fib: '',
      gap: '',
      mindset: '',
      tradeLink: '',
      trueReward: '',
      true_tp_sl: '',
      additional_confluences: '',
      time: '',
      top_bob_fv: '',
    });
    setActiveTab('basic');
  };

  const handleAcknowledgeViolations = () => {
    setAcknowledgedViolations(true);
    setShowViolationWarning(false);
  };

  // Updated input and select classNames with better styling
  const inputClassName = `mt-1 block w-full rounded-md ${readOnly ? 'bg-gray-50 opacity-90 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150 ease-in-out text-sm`;
  const selectClassName = `mt-1 block w-full rounded-md ${readOnly ? 'bg-gray-50 opacity-90 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150 ease-in-out text-sm`;

  // Updated TabButton style with more modern look
  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-medium text-sm rounded-t-md transition duration-150 ease-in-out ${
        activeTab === tab
          ? 'bg-white border-t border-l border-r border-gray-300 text-indigo-600 font-semibold shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  // Helper function to parse date in DD/MM/YYYY format
  const parseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Check if it's already in the right format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Handle DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      // Handle 2-digit years by assuming 20xx
      if (year.length === 2) {
        year = `20${year}`;
      }
      
      return `${year}-${month}-${day}`;
    }
    
    return dateStr;
  };
  
  // Function to check multiple trades for rule violations
  const checkMultipleTradesForViolations = async (trades: TradeFormData[]) => {
    if ((!user && !targetUserId) || !trades.length) return;
    
    try {
      // Get the user ID to use
      const userId = targetUserId || (user ? user.id : null);
      if (!userId) return;
      
      // Check first trade for violations to show in the UI
      const partialTrade = {
        pair: trades[0].pair,
        day: trades[0].day,
        lots: trades[0].lots,
        action: trades[0].action,
        direction: trades[0].direction
      };
      
      const result = await checkTradeAgainstRules(partialTrade, userId);
      
      if (!result.isValid) {
        setRuleViolations(result.violations);
        // Auto-acknowledge violations silently
        setAcknowledgedViolations(true);
        // Don't show warning
        setShowViolationWarning(false);
      } else {
        setRuleViolations([]);
        setShowViolationWarning(false);
      }
      
      // Track which trades have violations (but don't display them)
      const violationsSet = new Set<number>();
      if (!result.isValid) violationsSet.add(0);
      
      // Also check if any other trades might have violations
      let violationCount = !result.isValid ? 1 : 0;
      
      if (trades.length > 1) {
        for (let i = 1; i < trades.length; i++) {
          const trade = trades[i];
          const partialTrade = {
            pair: trade.pair,
            day: trade.day,
            lots: trade.lots,
            action: trade.action,
            direction: trade.direction
          };
          
          const tradeResult = await checkTradeAgainstRules(partialTrade, userId);
          if (!tradeResult.isValid) {
            violationsSet.add(i);
            violationCount++;
          }
        }
      }
      
      setTradesWithViolations(violationsSet);
      
      // If we have violations in multiple trades, show a summary
      if (violationCount > 1) {
        console.log(`Found rule violations in ${violationCount} trades`);
      }
    } catch (err) {
      console.error('Error checking multiple trades for rule violations:', err);
    }
  };
  
  // Helper function to parse a single trade line
  const parseSingleTradeLine = (line: string): TradeFormData | null => {
    try {
      // Split the pasted content by tabs or multiple spaces and trim each value
      const values = line.trim().split(/\t|\s{2,}/).map(val => val.trim());
      
      if (values.length < 10) {
        console.warn('Not enough data in line:', line);
        return null;
      }
      
      // Check if we have a currency pair
      const pairValue = values[3] || '';
      let normalizedPair = pairValue;
      
      // Handle shortened pair names (like 'GU' for 'GBP/USD')
      if (pairValue === 'GU') normalizedPair = 'GBP/USD';
      if (pairValue === 'EU') normalizedPair = 'EUR/USD';
      if (pairValue === 'GJ') normalizedPair = 'GBP/JPY';
      if (pairValue === 'GA') normalizedPair = 'GBP/AUD';
      if (pairValue === 'XU') normalizedPair = 'XAU/USD';
      if (pairValue === 'UJ') normalizedPair = 'USD/JPY';
      if (pairValue === 'UC') normalizedPair = 'USD/CHF';
      if (pairValue === 'AU') normalizedPair = 'AUD/USD';
      if (pairValue === 'UC') normalizedPair = 'USD/CAD';
      if (pairValue === 'NU') normalizedPair = 'NZD/USD';
      
      // Convert action to correct format
      const actionValue = values[4] || '';
      let normalizedAction: 'Buy' | 'Sell' = 'Buy';
      if (actionValue.toLowerCase().includes('sell') || 
          actionValue.toLowerCase().includes('short')) {
        normalizedAction = 'Sell';
      }
      
      // Get entry time - ensure it's a valid time format
      const entryTimeValue = values[2] || '';
      // Parse and normalize time, including AM/PM formats
      const validEntryTime = entryTimeValue.trim() 
        ? parseTimeString(entryTimeValue.trim())  
        : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
      // Extract profit/loss value
      let profitLossValue = 0;
      if (values.length > 19) {
        const plStr = values[19] || '';
        // Handle currency symbols and negative values
        const plMatch = plStr.match(/-?\s*[£$]?(\d+\.?\d*)/);
        if (plMatch && plMatch[1]) {
          profitLossValue = parseFloat(plMatch[1]);
          // Apply negative sign if present in original string
          if (plStr.includes('-')) {
            profitLossValue = -Math.abs(profitLossValue);
          }
        }
      }
      
      // Parse true_tp_sl field
      let trueTpSlValue = '';
      if (values.length > 20) {
        // Check if the value is a number
        const tpSlValue = values[20] || '';
        if (!isNaN(parseFloat(tpSlValue))) {
          trueTpSlValue = tpSlValue;
        }
      }
      
      // Parse trueReward field
      let trueRewardValue = '';
      if (values.length > 21) {
        trueRewardValue = values[21] || '';
      }
      
      // Parse tradeLink field
      let tradeLinkValue = '';
      if (values.length > 22) {
        tradeLinkValue = values[22] || '';
      }
      
      // Parse additional_confluences field
      let additionalConfluencesValue = '';
      if (values.length > 17) {
        additionalConfluencesValue = values[17] || '';
      }
      
      // Parse comments field
      let commentsValue = '';
      if (values.length > 23) {
        commentsValue = values[23] || '';
      }
      
      // Parse mindset field
      let mindsetValue = '';
      if (values.length > 18) {
        mindsetValue = values[18] || '';
      }
      
      const importedTrade: TradeFormData = {
        date: parseDate(values[0] || ''),
        day: values[1] || '',
        entryTime: validEntryTime,
        pair: normalizedPair,
        action: normalizedAction,
        direction: values[5] || directionOptions[0],
        lots: parseFloat(values[6]) || 0.01,
        pipStopLoss: parseInt(values[7]) || 0,
        pipTakeProfit: parseInt(values[8]) || 0,
        riskRatio: parseFloat(values[9]) || 0,
        orderType: values[10] || '',
        marketCondition: values[11] || '',
        ma: values[12] || '',                      // MA (index 12)
        fib: values[13] || '',                     // FIB (index 13)
        pivots: values[14] || '',                  // Pivot (index 14)
        gap: values[15] || '',                     // Gap (index 15)
        bankingLevel: values[16] || '',            // Banking Level (index 16)
        additional_confluences: additionalConfluencesValue,  // Additional Confluences (index 17)
        mindset: mindsetValue,                     // Mindset (index 18)
        profitLoss: profitLossValue,               // P/L (index 19)
        true_tp_sl: trueTpSlValue,                 // TrueTpSl (index 20)
        trueReward: trueRewardValue,               // TrueReward (index 21)
        tradeLink: tradeLinkValue,                 // Trade Link (index 22)
        comments: commentsValue,                   // Comments (index 23)
        exitTime: '',
        time: validEntryTime,                      // ENSURE time has the same valid value as entryTime
        top_bob_fv: '',                            // Balance Confluence (default empty)
      };
      
      return importedTrade;
    } catch (error) {
      console.error('Error parsing trade line:', error);
      return null;
    }
  };

  // Clipboard paste event handler
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportData(text);
      setImportError('');
    } catch (error) {
      console.error('Clipboard access error:', error);
      setImportError('Unable to access clipboard. Please paste the data manually.');
    }
  };

  // Function to handle import from clipboard
  const handleImport = () => {
    if (!importData.trim()) {
      setImportError('Please paste data first');
      return;
    }
    
    try {
      setImportError('');
      setMultipleTradesPreview([]);
      setImportPreview(null);
      setIsMultipleImport(false);
      setRuleViolations([]);
      setShowViolationWarning(false);
      setTradesWithViolations(new Set());
      setSelectedPreviewIndex(0);
      
      // Check if we have multiple lines (multiple trades)
      const lines = importData.trim().split(/\r?\n/);
      
      if (lines.length > 1) {
        // Process multiple trades
        setIsMultipleImport(true);
        const parsedTrades: TradeFormData[] = [];
        
        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          
          const parsedTrade = parseSingleTradeLine(line);
          if (parsedTrade) {
            parsedTrades.push(parsedTrade);
          }
        }
        
        if (parsedTrades.length === 0) {
          setImportError('Could not parse any valid trades from the data.');
          return;
        }
        
        setMultipleTradesPreview(parsedTrades);
        
        // Check for rule violations
        if (user) {
          checkMultipleTradesForViolations(parsedTrades);
        }
      } else {
        // Process single trade
        const parsedTrade = parseSingleTradeLine(importData);
        if (!parsedTrade) {
          setImportError('Failed to parse trade data. Please check the format.');
          return;
        }
        
        setImportPreview(parsedTrade);
        
        // Check for rule violations if user is logged in
        if (user) {
          const partialTrade = {
            pair: parsedTrade.pair,
            day: parsedTrade.day,
            lots: parsedTrade.lots,
            action: parsedTrade.action,
            direction: parsedTrade.direction
          };
          
          checkTradeAgainstRules(partialTrade, user.id).then(result => {
            if (!result.isValid) {
              setRuleViolations(result.violations);
              // Silently acknowledge violations without showing warnings
              setAcknowledgedViolations(true);
              setShowViolationWarning(false);
            } else {
              setRuleViolations([]);
              setShowViolationWarning(false);
            }
          }).catch(err => {
            console.error('Error checking rules for imported trade:', err);
          });
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to parse import data. Please check the format.');
    }
  };

  // Helper function to convert Excel date number to YYYY-MM-DD format
  const convertExcelDateToISO = (excelDate: number): string => {
    try {
      // For Excel dates, 1 = January 1, 1900
      // Subtract 1 to account for Excel's day-off issue
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      
      // Format as YYYY-MM-DD  
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // For debugging
      console.log(`Converting Excel date: ${excelDate} -> ${year}-${month}-${day}`);
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error converting Excel date:', error);
      return '';
    }
  };
  
  // Helper function to convert Excel time number to HH:MM format
  const convertExcelTimeToHHMM = (excelTime: number): string => {
    try {
      if (isNaN(excelTime) || excelTime === undefined) return '';
      
      // Excel times are stored as fractions of a 24 hour day
      const totalMinutes = Math.round(excelTime * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error converting Excel time:', error);
      return '';
    }
  };

  // New helper function to parse time strings including AM/PM format
  const parseTimeString = (timeStr: string): string => {
    try {
      if (!timeStr || typeof timeStr !== 'string') return '';
      
      // If already in 24-hour format, return as is
      if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
        return timeStr;
      }
      
      // Handle various time formats with AM/PM
      // Examples: "5.30pm", "5:30pm", "5.30 pm", "5:30 PM", etc.
      const timeRegex = /(\d+)(?::|\.|\s)(\d+)?\s*([ap]\.?m\.?)?/i;
      const match = timeStr.match(timeRegex);
      
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const isPM = match[3] && match[3].toLowerCase().startsWith('p');
        
        // Convert to 24-hour format
        if (isPM && hours < 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      
      // If all else fails, try to create a date object and extract time
      try {
        const date = new Date(`2000-01-01T${timeStr}`);
        if (!isNaN(date.getTime())) {
          return date.toTimeString().substring(0, 5);
        }
      } catch (e) {
        // Ignore errors from this attempt
      }
      
      console.warn('Could not parse time string:', timeStr);
      return '';
    } catch (error) {
      console.error('Error parsing time string:', error, timeStr);
      return '';
    }
  };

  // Helper function to handle Excel file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if file is an Excel file
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
          file.type !== 'application/vnd.ms-excel') {
        setImportError('Please upload only Excel files (.xlsx or .xls)');
        return;
      }
      
      setExcelFile(file);
      setExcelFileName(file.name);
      setImportError('');
      
      // Read the workbook to get sheet names
      loadSheetNames(file);
    }
  };
  
  // Function to load sheet names from the Excel file
  const loadSheetNames = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      if (workbook.SheetNames.length === 0) {
        setImportError('No sheets found in the Excel file');
        return;
      }
      
      setAvailableSheets(workbook.SheetNames);
      setSelectedSheet(workbook.SheetNames[0]); // Select the first sheet by default
    } catch (error) {
      console.error('Error reading Excel file sheets:', error);
      setImportError('Failed to read sheets from the Excel file');
    }
  };
  
  // Helper function to convert Excel number to day of week
  const convertExcelNumberToDay = (excelDate: number): string => {
    try {
      // Convert Excel date to JS date using our existing function
      const dateStr = convertExcelDateToISO(excelDate);
      const date = new Date(dateStr);
      
      // Get day of week
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[date.getDay()];
      
      console.log(`Converting Excel date: ${excelDate} to day: ${dayOfWeek}`);
      
      return dayOfWeek;
    } catch (error) {
      console.error('Error converting Excel number to day:', error);
      return '';
    }
  };
  
  // Function to parse Excel file
  const handleProcessExcelFile = async () => {
    if (!excelFile) {
      setImportError('Please select an Excel file first');
      return;
    }
    
    if (!selectedSheet) {
      setImportError('Please select a sheet from the Excel file');
      return;
    }
    
    setIsProcessingFile(true);
    setImportError('');
    
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Check if the selected sheet exists
      if (!workbook.SheetNames.includes(selectedSheet)) {
        setImportError(`Sheet "${selectedSheet}" not found in the workbook`);
        setIsProcessingFile(false);
        return;
      }
      
      const worksheet = workbook.Sheets[selectedSheet];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        setImportError('No data found in the selected sheet');
        setIsProcessingFile(false);
        return;
      }
      
      // Log the first row for debugging
      if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
        console.log('First row:', jsonData[0]);
        if (jsonData.length > 1) console.log('Second row:', jsonData[1]);
        if (jsonData.length > 2) console.log('Third row:', jsonData[2]);
      }
      
      // ALWAYS start from the 3rd row (index 2)
      const startRow = 2; 
      
      // Skip the first two rows and process the data rows
      const rows = jsonData.slice(startRow);
      
      if (rows.length === 0) {
        setImportError('No data rows found in the selected sheet after skipping header rows');
        setIsProcessingFile(false);
        return;
      }
      
      // Convert Excel rows to trade data
      const parsedTrades: TradeFormData[] = [];
      let skippedRows = 0;
      
      for (const row of rows) {
        if (!row || !Array.isArray(row) || row.length < 10) {
          skippedRows++;
          continue; // Skip rows with insufficient data
        }
        
        // IMPORTANT: Skip the first column (index 0) which contains "trades"
        // Start mapping from the second column (index 1) which contains "date"
        const adjustedRow = row.slice(1);
        
        // Process the cells and handle Excel date/time formats
        const processedRow = adjustedRow.map((cell, index) => {
          // Convert cell to string if it exists
          if (cell === undefined || cell === null) return '';
          
          // Special handling for date (first column)
          if (index === 0 && typeof cell === 'number') {
            return convertExcelDateToISO(cell);
          }
          
          // Special handling for day of week (second column)
          if (index === 1 && typeof cell === 'number') {
            return convertExcelNumberToDay(cell);
          }
          
          // Special handling for entryTime (third column)
          if (index === 2) {
            // Handle both numeric Excel time and string time with AM/PM
            if (typeof cell === 'number') {
              return convertExcelTimeToHHMM(cell);
            } else if (typeof cell === 'string') {
              return parseTimeString(cell);
            }
          }
          
          return cell.toString().trim();
        });
        
        // Only take columns up to "comments" (limit to 24 columns max)
        // This ensures we don't include any extraneous columns after the expected fields
        const limitedRow = processedRow.slice(0, 24);
        
        // Create a string that mimics the format expected by parseSingleTradeLine
        const tradeLine = limitedRow.join('\t');
        const parsedTrade = parseSingleTradeLine(tradeLine);
        
        if (parsedTrade) {
          parsedTrades.push(parsedTrade);
        } else {
          skippedRows++;
        }
      }
      
      if (parsedTrades.length === 0) {
        setImportError(`Could not parse any valid trades from the Excel file. ${skippedRows} rows were skipped due to invalid data.`);
        setIsProcessingFile(false);
        return;
      }
      
      // Set the multiple trades preview
      setMultipleTradesPreview(parsedTrades);
      setIsMultipleImport(true);
      setSelectedPreviewIndex(0);
      
      // Show success message with skipped rows info if any
      if (skippedRows > 0) {
        setImportError(`Successfully parsed ${parsedTrades.length} trades. ${skippedRows} rows were skipped.`);
      }
      
      // Check for rule violations if user is logged in
      if (user) {
        await checkMultipleTradesForViolations(parsedTrades);
      }
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Error processing Excel file:', error);
      setImportError('Failed to process the Excel file. Please check the format.');
    } finally {
      setIsProcessingFile(false);
    }
  };
  
  // Function to trigger file input click
  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Function to apply the imported data
  const applyImport = () => {
    if (isMultipleImport && multipleTradesPreview.length > 0) {
      // Use the currently selected trade
      setFormData(multipleTradesPreview[selectedPreviewIndex]);
      
      // If there's profit/loss, update the input state too
      if (multipleTradesPreview[selectedPreviewIndex].profitLoss) {
        setProfitLossInput(multipleTradesPreview[selectedPreviewIndex].profitLoss.toString());
      }
      
      setActiveTab('basic'); // Switch to the basic tab to show the imported data
      setImportPreview(null);
      setMultipleTradesPreview([]);
      setImportData('');
      setIsMultipleImport(false);
      
      // Set a message for the user
      setImportError('Note: Applied trade #' + (selectedPreviewIndex + 1) + '. For all trades, use the "Import All Trades" button instead.');
    } else if (importPreview) {
      setFormData(importPreview);
      // If there's profit/loss, update the input state too
      if (importPreview.profitLoss) {
        setProfitLossInput(importPreview.profitLoss.toString());
      }
      setActiveTab('basic'); // Switch to the basic tab to show the imported data
      setImportPreview(null);
      setImportData('');
    }
  };
  
  // Function to apply a specific trade from the multiple preview list
  const applySpecificTrade = (index: number) => {
    if (multipleTradesPreview[index]) {
      setFormData(multipleTradesPreview[index]);
      // If there's profit/loss, update the input state too
      if (multipleTradesPreview[index].profitLoss) {
        setProfitLossInput(multipleTradesPreview[index].profitLoss.toString());
      }
      setActiveTab('basic'); // Switch to the basic tab to show the imported data
      setImportPreview(null);
      setMultipleTradesPreview([]);
      setImportData('');
      setIsMultipleImport(false);
    }
  };
  
  // Function to clear import data
  const clearImport = () => {
    setImportData('');
    setImportPreview(null);
    setMultipleTradesPreview([]);
    setImportError('');
    setIsMultipleImport(false);
  };

  // Function to import and submit all trades at once
  const importAndSubmitAllTrades = async () => {
    if (!multipleTradesPreview.length) return;
    
    setLoading(true);
    setError('');
    let successCount = 0;
    let failureCount = 0;
    
    try {
      // Process each trade in sequence
      for (const trade of multipleTradesPreview) {
        try {
          // Ensure time field has a valid value (use entryTime if time is empty)
          if (!trade.time || trade.time.trim() === '') {
            trade.time = trade.entryTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
          }
          
          // Prepare the trade data for submission
          const submissionData = Object.fromEntries(
            Object.entries(trade).map(([key, value]) => {
              // Convert empty strings to null for optional fields
              if ((key === 'exitTime' || key === 'tradeLink') && value === '') {
                return [key, null];
              }
              return [key, value];
            })
          );
          
          // Remove the id property if it exists
          const { id, ...createData } = submissionData;
          
          // Check for rule violations for this specific trade
          if (user) {
            // Only check specific fields that might cause violations
            const partialTrade = {
              pair: trade.pair,
              day: trade.day,
              lots: trade.lots,
              action: trade.action,
              direction: trade.direction
            };
            
            // Check if this trade would violate any rules
            const ruleCheckResult = await checkTradeAgainstRules(partialTrade, user.id);
            
            // Create the trade
            const result = await createTrade(createData as Omit<Trade, 'id'>);
            const tradeId = result.id;
            
            // If there are violations, record them with automatic acknowledgment
            if (!ruleCheckResult.isValid && user) {
              for (const violation of ruleCheckResult.violations) {
                await createTradeViolation({
                  tradeId,
                  userId: user.id,
                  ruleType: violation.ruleType as "pair" | "day" | "lot" | "action_direction",
                  violatedValue: violation.violatedValue,
                  allowedValues: violation.allowedValues,
                  acknowledged: true
                });
              }
            }
            
            successCount++;
          } else {
            // If no user is logged in, simply create the trade without checking rules
            await createTrade(createData as Omit<Trade, 'id'>);
            successCount++;
          }
        } catch (err) {
          console.error('Error submitting trade:', err);
          failureCount++;
        }
      }
      
      // Close the form only if at least one trade was successful
      if (successCount > 0) {
        // Show a message with the results before closing
        const resultMessage = `Successfully imported ${successCount} trades${failureCount > 0 ? ` (${failureCount} failed)` : ''}.`;
        alert(resultMessage);
        onClose();
      } else {
        setError(`Failed to import any trades. Please check the data and try again.`);
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during bulk import');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to ensure consistent date format 
  const formatDateForDB = (dateStr: string): string => {
    // If empty, return empty
    if (!dateStr) return '';
    
    try {
      // Check if it looks like DD/MM/YYYY format
      const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = dateStr.match(ddmmyyyy);
      
      if (match) {
        // Convert from DD/MM/YYYY to YYYY-MM-DD
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
      
      // If it's already in YYYY-MM-DD format, return as is
      const yyyymmdd = /^\d{4}-\d{2}-\d{2}$/;
      if (yyyymmdd.test(dateStr)) {
        return dateStr;
      }
      
      // If we get here, try to parse the date and format it with local timezone
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // Use local timezone components rather than UTC
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
      } catch (e) {
        console.warn('Failed to parse date string:', dateStr);
      }
      
      // If all else fails, return the original string
      return dateStr;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      {readOnly && (
        <div className="mb-4 rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-blue-700">
                You are viewing this trade in read-only mode. Click the 'Edit' button to make changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Time and Date Information - commented out since we auto-apply the current date/time
      <div className="px-4 py-3 mb-2 border-b border-gray-200 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Local Time:</span>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={populateCurrentDateTime}
              className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
            >
              Use Current Date/Time
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Day</div>
            <div className="text-sm font-medium">{dateInfo.day}</div>
          </div>
          <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Date</div>
            <div className="text-sm font-medium">{dateInfo.date}</div>
          </div>
          <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Time</div>
            <div className="text-sm font-medium">{dateInfo.time}</div>
          </div>
          <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">Timezone</div>
            <div className="text-sm font-medium">{dateInfo.timezone} (UTC{dateInfo.offset})</div>
          </div>
        </div>
      </div>
      */}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {showViolationWarning && (
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Trading rule violations detected</h3>
              <div className="mt-2 text-sm">
                <ul className="list-disc pl-5 space-y-1">
                  {ruleViolations.map((violation, index) => (
                    <li key={index}>
                      <strong>{violation.ruleType === 'pair' ? 'Currency Pair' : 
                              violation.ruleType === 'day' ? 'Trading Day' : 
                              violation.ruleType === 'lot' ? 'Lot Size' : 
                              violation.ruleType === 'action_direction' ? 'Against Trend' : 
                              violation.ruleType}:</strong> {' '}
                      {violation.violatedValue} is not allowed. Allowed values: {violation.allowedValues.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleAcknowledgeViolations}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded-md transition-colors duration-150"
                >
                  Acknowledge and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-1 border-b border-gray-300">
        <TabButton tab="basic" label="Basic Info" />
        <TabButton tab="technical" label="Technical Details" />
        <TabButton tab="analysis" label="Confluences" />
        <TabButton tab="result" label="Result" />
        <TabButton tab="notes" label="Notes & Links" />
        {!readOnly && <TabButton tab="import" label="Import" />}
      </div>

      <div className="mt-6">
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                {tradingDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pair</label>
              <select
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                {currencyPairs.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value as 'Buy' | 'Sell' })}
                className={`${selectClassName} ${formData.action === 'Buy' ? 'text-green-600' : 'text-red-600'} font-medium`}
                disabled={readOnly}
              >
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Time</label>
              <input
                type="time"
                value={formData.entryTime}
                onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exit Time</label>
              <input
                type="time"
                value={formData.exitTime}
                onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select Direction</option>
                {directionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lots</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.lots}
                onChange={(e) => setFormData({ ...formData, lots: parseFloat(e.target.value) })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stop Loss (pips)</label>
              <input
                type="number"
                value={formData.pipStopLoss}
                onChange={(e) => setFormData({ ...formData, pipStopLoss: parseInt(e.target.value) })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Take Profit (pips)</label>
              <input
                type="number"
                value={formData.pipTakeProfit}
                onChange={(e) => setFormData({ ...formData, pipTakeProfit: parseInt(e.target.value) })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Ratio</label>
              <input
                type="number"
                step="0.1"
                value={formData.riskRatio}
                onChange={(e) => setFormData({ ...formData, riskRatio: parseFloat(e.target.value) })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
              <select
                value={formData.orderType}
                onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select Order Type</option>
                {orderTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pivots</label>
              <select
                value={formData.pivots}
                onChange={(e) => setFormData({ ...formData, pivots: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select Pivot</option>
                <option value="R3">R3</option>
                <option value="R2">R2</option>
                <option value="R1">R1</option>
                <option value="P">P</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banking Level</label>
              <input
                type="text"
                value={formData.bankingLevel}
                onChange={(e) => setFormData({ ...formData, bankingLevel: e.target.value })}
                className={inputClassName}
                placeholder="e.g., Major Support, Key Resistance"
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market Condition</label>
              <select
                value={formData.marketCondition}
                onChange={(e) => setFormData({ ...formData, marketCondition: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select Market Condition</option>
                {marketConditionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance Confluences</label>
              <select
                value={formData.top_bob_fv}
                onChange={(e) => setFormData({ ...formData, top_bob_fv: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select Balance Confluence</option>
                {balanceConfluenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MA</label>
              <select
                value={formData.ma}
                onChange={(e) => setFormData({ ...formData, ma: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select MA</option>
                {maOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FIB</label>
              <select
                value={formData.fib}
                onChange={(e) => setFormData({ ...formData, fib: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select FIB</option>
                {fibOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gap</label>
              <select
                value={formData.gap}
                onChange={(e) => setFormData({ ...formData, gap: e.target.value })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="">Select Gap</option>
                {gapOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Confluences</label>
              <textarea
                value={formData.additional_confluences}
                onChange={(e) => setFormData({ ...formData, additional_confluences: e.target.value })}
                rows={3}
                className={inputClassName}
                placeholder="Enter any additional confluences that influenced this trade"
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {activeTab === 'result' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">True Reward</label>
              <input
                type="text"
                value={formData.trueReward}
                onChange={(e) => setFormData({ ...formData, trueReward: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">True Pips</label>
              <input
                type="text"
                value={formData.true_tp_sl}
                onChange={(e) => setFormData({ ...formData, true_tp_sl: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profit/Loss</label>
              <input
                type="text"
                value={profitLossInput}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string, minus sign alone, or valid number (including negative)
                  if (value === '' || value === '-' || !isNaN(parseFloat(value))) {
                    setProfitLossInput(value);
                    if (value !== '' && value !== '-') {
                      setFormData({ ...formData, profitLoss: parseFloat(value) });
                    } else {
                      // If it's empty or just a minus sign, set profitLoss to 0 temporarily
                      setFormData({ ...formData, profitLoss: 0 });
                    }
                  }
                }}
                className={`${inputClassName} ${profitLossInput && parseFloat(profitLossInput) >= 0 ? 'text-green-600' : profitLossInput && parseFloat(profitLossInput) < 0 ? 'text-red-600' : ''} font-medium`}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drawdown</label>
              <input
                type="number"
                value={formData.drawdown === undefined ? '' : formData.drawdown}
                onChange={(e) => {
                  const value = e.target.value;
                  // If empty string, set to undefined, otherwise parse as number
                  setFormData({ 
                    ...formData, 
                    drawdown: value === '' ? undefined : parseFloat(value) 
                  });
                }}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mindset</label>
              <input
                type="text"
                value={formData.mindset}
                onChange={(e) => setFormData({ ...formData, mindset: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trade Link</label>
              <input
                type="text"
                value={formData.tradeLink}
                onChange={(e) => setFormData({ ...formData, tradeLink: e.target.value })}
                className={inputClassName}
                placeholder="Enter URL to trade chart or analysis"
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={4}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {/* New Import Tab */}
        {activeTab === 'import' && !readOnly && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Trade Data</h3>
              <p className="text-sm text-gray-500 mb-4">
                Paste data from Excel or spreadsheet applications. You can paste multiple trades (one per line) or a single trade.
              </p>
              <div className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto mb-4">
                <code>Date | Day | Time | Pair | Action | Direction | Lots | SL | TP | RR | OrderType | MarketCondition | MA | FIB | Pivot | Gap | BankingLevel | Additional_Confluences | Mindset | P/L | TrueTpSl | TrueReward | TradeLink | Comments</code>
              </div>
              
              {/* First method: Clipboard paste */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-2">Method 1: Copy & Paste</h4>
                <div className="flex items-center mb-2">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-2"
                  >
                    <Clipboard className="h-4 w-4 mr-2" />
                    Paste from Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={clearImport}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Clear
                  </button>
                </div>
                
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={4}
                  placeholder="Paste your data here..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleImport}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Preview Pasted Data
                  </button>
                </div>
              </div>
              
              {/* Second method: Excel file upload */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-800 mb-2">Method 2: Excel File Upload</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Upload an Excel file (.xlsx or .xls) with your trades data. The first row should contain headers matching the order shown above.
                </p>
                
                <div className="flex items-center mb-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <button
                    type="button"
                    onClick={handleFileButtonClick}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Excel File
                  </button>
                  
                  {excelFileName && (
                    <span className="text-sm text-gray-600">{excelFileName}</span>
                  )}
                </div>
                
                {/* Sheet selection dropdown */}
                {availableSheets.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Sheet
                    </label>
                    <div className="relative mt-1">
                      <select
                        value={selectedSheet}
                        onChange={(e) => setSelectedSheet(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        {availableSheets.map((sheet) => (
                          <option key={sheet} value={sheet}>
                            {sheet}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Selected sheet: {selectedSheet} ({availableSheets.indexOf(selectedSheet) + 1} of {availableSheets.length})
                    </p>
                    
                    <p className="mt-1 text-xs text-gray-500">
                      Note: The system will automatically skip the first 2 rows (headers), ignore the first column ("trades"), 
                      and ignore any columns after "comments". Date and time values will be automatically formatted correctly.
                    </p>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessExcelFile}
                    disabled={!excelFile || isProcessingFile || !selectedSheet}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isProcessingFile ? 'Processing...' : 'Process Excel File'}
                  </button>
                </div>
              </div>
              
              {importError && (
                <p className="mt-4 text-sm text-red-600">{importError}</p>
              )}
            </div>
            
            {/* Preview for single trade */}
            {importPreview && !isMultipleImport && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Import Preview</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date:</p>
                      <p className="text-sm">{importPreview.date}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Day:</p>
                      <p className="text-sm">{importPreview.day}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Entry Time:</p>
                      <p className="text-sm">{importPreview.entryTime}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pair:</p>
                      <p className="text-sm">{importPreview.pair}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Action:</p>
                      <p className="text-sm">{importPreview.action}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Direction:</p>
                      <p className="text-sm">{importPreview.direction}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Lots:</p>
                      <p className="text-sm">{importPreview.lots}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">SL (pips):</p>
                      <p className="text-sm">{importPreview.pipStopLoss}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">TP (pips):</p>
                      <p className="text-sm">{importPreview.pipTakeProfit}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Risk Ratio:</p>
                      <p className="text-sm">{importPreview.riskRatio}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Type:</p>
                      <p className="text-sm">{importPreview.orderType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Market Condition:</p>
                      <p className="text-sm">{importPreview.marketCondition}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">MA:</p>
                      <p className="text-sm">{importPreview.ma}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">FIB:</p>
                      <p className="text-sm">{importPreview.fib}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pivots:</p>
                      <p className="text-sm">{importPreview.pivots}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Gap:</p>
                      <p className="text-sm">{importPreview.gap}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Banking Level:</p>
                      <p className="text-sm">{importPreview.bankingLevel}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Additional Confluences:</p>
                      <p className="text-xs text-gray-900 truncate">{importPreview.additional_confluences}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Mindset:</p>
                      <p className="text-sm">{importPreview.mindset}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Profit/Loss:</p>
                      <p className={`text-sm ${importPreview.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {importPreview.profitLoss}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">True TP/SL:</p>
                      <p className="text-sm">{importPreview.true_tp_sl}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">True Reward:</p>
                      <p className="text-sm">{importPreview.trueReward}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Trade Link:</p>
                      <p className="text-xs text-gray-900 truncate">{importPreview.tradeLink}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Comments:</p>
                      <p className="text-xs text-gray-900">{importPreview.comments}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={applyImport}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Apply Import
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Preview for multiple trades */}
            {isMultipleImport && multipleTradesPreview.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-900">Multiple Trades Preview ({multipleTradesPreview.length})</h4>
                </div>
                
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pair</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lots</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SL</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">TP</th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {multipleTradesPreview.map((trade, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${selectedPreviewIndex === index ? 'bg-blue-50' : ''}`}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {trade.date}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.pair}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <span 
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  trade.action === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {trade.action}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.entryTime}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.lots}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.pipStopLoss}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{trade.pipTakeProfit}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                              <span className={trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {trade.profitLoss}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => setSelectedPreviewIndex(index)}
                                className={`text-blue-600 hover:text-blue-900 ${selectedPreviewIndex === index ? 'font-bold' : ''}`}
                              >
                                Preview
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Options for multiple trades */}
                <div className="mt-6 flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <p className="text-sm text-gray-700">
                        Ready to import all {multipleTradesPreview.length} trades at once
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={importAndSubmitAllTrades}
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Importing...' : `Import All ${multipleTradesPreview.length} Trades`}
                      </button>
                    </div>
                  </div>
                  
                  {loading && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                      <p className="text-sm">Importing trades. Please wait...</p>
                    </div>
                  )}
                </div>
                
                {/* Detailed view of the selected trade */}
                {multipleTradesPreview.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-medium text-gray-700">
                        Trade #{selectedPreviewIndex + 1} Details
                      </h5>
                      <button 
                        type="button"
                        onClick={applyImport}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Apply This Trade
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Date:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].date}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Day:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].day}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Entry Time:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].entryTime}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Pair:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].pair}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Action:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].action}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Direction:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].direction}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Lots:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].lots}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">SL (pips):</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].pipStopLoss}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">TP (pips):</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].pipTakeProfit}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Risk Ratio:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].riskRatio}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Order Type:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].orderType}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Market Condition:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].marketCondition}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">MA:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].ma}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">FIB:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].fib}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Pivots:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].pivots}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Gap:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].gap}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Banking Level:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].bankingLevel}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Additional Confluences:</p>
                          <p className="text-xs text-gray-900 truncate">{multipleTradesPreview[selectedPreviewIndex].additional_confluences}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Mindset:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].mindset}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Profit/Loss:</p>
                          <p className={`text-xs ${multipleTradesPreview[selectedPreviewIndex].profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {multipleTradesPreview[selectedPreviewIndex].profitLoss}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">True TP/SL:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].true_tp_sl}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">True Reward:</p>
                          <p className="text-xs">{multipleTradesPreview[selectedPreviewIndex].trueReward}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Trade Link:</p>
                          <p className="text-xs text-gray-900 truncate">{multipleTradesPreview[selectedPreviewIndex].tradeLink}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-gray-500">Comments:</p>
                          <p className="text-xs text-gray-900">{multipleTradesPreview[selectedPreviewIndex].comments}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end mt-8">
          <div className="flex space-x-4">
            {!readOnly && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
              >
                Reset
              </button>
            )}
            <button
              type={readOnly ? "button" : "submit"}
              onClick={readOnly ? onClose : undefined}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {readOnly ? 'Close' : loading ? 'Saving...' : existingTrade ? 'Update Trade' : 'Submit Trade'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}