import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { createTrade, updateTrade, checkTradeAgainstRules, createTradeViolation, getUserTradingRules } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Clipboard, AlertTriangle } from 'lucide-react';

// Make the Trade interface work with both create and update operations
interface TradeFormData extends Omit<Trade, 'id'> {
  id?: string;
}

const currencyPairs = [
  'GBP/USD',
  'EUR/USD',
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
  'Friday'
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

interface Props {
  onClose: () => void;
  existingTrade?: Trade;
  readOnly?: boolean;
}

type TabType = 'basic' | 'technical' | 'analysis' | 'result' | 'notes' | 'import';

export default function TradeForm({ onClose, existingTrade, readOnly = false }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [profitLossInput, setProfitLossInput] = useState<string>(
    // Initialize with existing trade value or empty string for new trades
    existingTrade ? existingTrade.profitLoss.toString() : ''
  );
  const [formData, setFormData] = React.useState<TradeFormData>(
    existingTrade || {
      date: new Date().toISOString().split('T')[0],
      pair: 'GBP/USD',
      action: 'Buy',
      entryTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      exitTime: '',
      lots: 0.01,
      pipStopLoss: 0,
      pipTakeProfit: 0,
      profitLoss: 0,
      pivots: '',
      bankingLevel: '',
      riskRatio: 0,
      comments: '',
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
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
      time: '', // Adding required time field with empty string default
    }
  );

  const { user } = useAuth();
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

  // Update day when date changes, but only if the user hasn't manually changed it
  useEffect(() => {
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Only update if the day is one of the trading days (Mon-Fri)
      if (tradingDays.includes(dayOfWeek)) {
        setFormData(prevData => ({ ...prevData, day: dayOfWeek }));
      }
    }
  }, [formData.date]);

  // Check for rule violations when key fields change
  useEffect(() => {
    const checkRules = async () => {
      if (!user) return;

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
        const result = await checkTradeAgainstRules(partialTrade, user.id);
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
      if (!user) return;
      
      try {
        console.log('Checking against trend rule for user:', user.id);
        const rules = await getUserTradingRules(user.id);
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
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if in read-only mode
    if (readOnly) {
      onClose();
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      // Create a new object without empty strings for optional fields
      const submissionData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          // Convert empty strings to null for optional fields
          if (key === 'exitTime' && value === '') {
            return [key, null];
          }
          return [key, value];
        })
      );

      let tradeId: string;
      
      if (existingTrade) {
        const result = await updateTrade(existingTrade.id, submissionData);
        tradeId = existingTrade.id;
      } else {
        // The id is optional in our form, but not needed for create
        const { id, ...createData } = submissionData;
        const result = await createTrade(createData as Omit<Trade, 'id'>);
        tradeId = result.id;
      }

      // If there are acknowledged violations, record them
      if (acknowledgedViolations && ruleViolations.length > 0 && user) {
        // Only create violations if this is a new trade or if editing and the violations changed
        if (!existingTrade) {
          // For new trades, create all violations
          for (const violation of ruleViolations) {
            await createTradeViolation({
              tradeId,
              userId: user.id,
              ruleType: violation.ruleType as any,
              violatedValue: violation.violatedValue,
              allowedValues: violation.allowedValues,
              acknowledged: true
            });
          }
        }
        // For existing trades, don't create new violations as they were already recorded
        // If we need to update existing violations, we would implement that logic here
      }

      onClose();
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the trade');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const today = new Date();
    setFormData({
      date: today.toISOString().split('T')[0],
      pair: 'EUR/USD',
      action: 'Buy',
      entryTime: today.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      exitTime: '',
      lots: 0.01,
      pipStopLoss: 0,
      pipTakeProfit: 0,
      profitLoss: 0,
      pivots: '',
      bankingLevel: '',
      riskRatio: 0,
      comments: '',
      day: today.toLocaleDateString('en-US', { weekday: 'long' }),
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
    });
    setActiveTab('basic');
  };

  const handleAcknowledgeViolations = () => {
    setAcknowledgedViolations(true);
    setShowViolationWarning(false);
  };

  const inputClassName = `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${readOnly ? 'bg-gray-50 opacity-90 cursor-not-allowed' : 'bg-white'}`;
  const selectClassName = inputClassName;

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-medium text-sm rounded-t-md ${
        activeTab === tab
          ? 'bg-white border-t border-l border-r border-gray-300 text-indigo-600'
          : 'bg-gray-100 text-gray-700 hover:text-gray-900'
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
    if (!user || !trades.length) return;
    
    try {
      // Check first trade for violations to show in the UI
      const partialTrade = {
        pair: trades[0].pair,
        day: trades[0].day,
        lots: trades[0].lots,
        action: trades[0].action,
        direction: trades[0].direction
      };
      
      const result = await checkTradeAgainstRules(partialTrade, user.id);
      
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
          
          const tradeResult = await checkTradeAgainstRules(partialTrade, user.id);
          if (!tradeResult.isValid) {
            violationCount++;
            violationsSet.add(i);
          }
        }
      }
      
      // Update the tracking state silently
      setTradesWithViolations(violationsSet);
      
      // No need to show any warning messages about violations
      
      return violationCount > 0;
    } catch (err) {
      console.error('Error checking multiple trades for violations:', err);
      return false;
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
      // Default to current time if empty
      const validEntryTime = entryTimeValue.trim() || 
                            new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
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
      };
      
      return importedTrade;
    } catch (error) {
      console.error('Error parsing trade line:', error);
      return null;
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
                  ruleType: violation.ruleType as any,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex space-x-2 border-b border-gray-300">
        <TabButton tab="basic" label="Basic Info" />
        <TabButton tab="technical" label="Technical Details" />
        <TabButton tab="analysis" label="Confluences" />
        <TabButton tab="result" label="Result" />
        <TabButton tab="notes" label="Notes & Links" />
        {!readOnly && <TabButton tab="import" label="Import" />}
      </div>

      <div className="mt-4">
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Day</label>
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
              <label className="block text-sm font-medium text-gray-700">Pair</label>
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
              <label className="block text-sm font-medium text-gray-700">Action</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value as 'Buy' | 'Sell' })}
                className={selectClassName}
                disabled={readOnly}
              >
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Entry Time</label>
              <input
                type="time"
                value={formData.entryTime}
                onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Exit Time</label>
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
              <label className="block text-sm font-medium text-gray-700">Direction</label>
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
              <label className="block text-sm font-medium text-gray-700">Lots</label>
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
              <label className="block text-sm font-medium text-gray-700">Stop Loss (pips)</label>
              <input
                type="number"
                value={formData.pipStopLoss}
                onChange={(e) => setFormData({ ...formData, pipStopLoss: parseInt(e.target.value) })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Take Profit (pips)</label>
              <input
                type="number"
                value={formData.pipTakeProfit}
                onChange={(e) => setFormData({ ...formData, pipTakeProfit: parseInt(e.target.value) })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Risk Ratio</label>
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
              <label className="block text-sm font-medium text-gray-700">Order Type</label>
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
              <label className="block text-sm font-medium text-gray-700">Pivots</label>
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
              <label className="block text-sm font-medium text-gray-700">Banking Level</label>
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
              <label className="block text-sm font-medium text-gray-700">Market Condition</label>
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
              <label className="block text-sm font-medium text-gray-700">MA</label>
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
              <label className="block text-sm font-medium text-gray-700">FIB</label>
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
              <label className="block text-sm font-medium text-gray-700">Gap</label>
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
              <label className="block text-sm font-medium text-gray-700">Additional Confluences</label>
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
              <label className="block text-sm font-medium text-gray-700">True Reward</label>
              <input
                type="text"
                value={formData.trueReward}
                onChange={(e) => setFormData({ ...formData, trueReward: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">True TP/SL</label>
              <input
                type="text"
                value={formData.true_tp_sl}
                onChange={(e) => setFormData({ ...formData, true_tp_sl: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Profit/Loss</label>
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
                className={inputClassName}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mindset</label>
              <input
                type="text"
                value={formData.mindset}
                onChange={(e) => setFormData({ ...formData, mindset: e.target.value })}
                className={inputClassName}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Trade Link</label>
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
              <label className="block text-sm font-medium text-gray-700">Comments</label>
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
              
              {importError && (
                <p className="mt-2 text-sm text-red-600">{importError}</p>
              )}
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleImport}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Preview Import
                </button>
              </div>
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
                      <p className="text-sm text-gray-900 truncate">{importPreview.additional_confluences}</p>
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
                      <p className="text-sm text-gray-900 truncate">{importPreview.tradeLink}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Comments:</p>
                      <p className="text-sm text-gray-900">{importPreview.comments}</p>
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Reset
              </button>
            )}
            <button
              type={readOnly ? "button" : "submit"}
              onClick={readOnly ? onClose : undefined}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {readOnly ? 'Close' : loading ? 'Saving...' : existingTrade ? 'Update Trade' : 'Submit Trade'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}