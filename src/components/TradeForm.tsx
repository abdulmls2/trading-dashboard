import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { createTrade, updateTrade, checkTradeAgainstRules, createTradeViolation, getUserTradingRules } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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

type TabType = 'basic' | 'technical' | 'analysis' | 'result' | 'notes';

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

      {/* Rule Violation Warning */}
      {showViolationWarning && ruleViolations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Trading Rule Violation</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {ruleViolations.map((violation, index) => (
                    <li key={index}>
                      {violation.ruleType === 'action_direction' ? (
                        <strong>You are going against the trend, not allowed</strong>
                      ) : (
                        <>
                          <strong>{violation.ruleType.charAt(0).toUpperCase() + violation.ruleType.slice(1)}:</strong> {violation.violatedValue} is not in the allowed values: {violation.allowedValues.join(', ')}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAcknowledgeViolations}
                  className="text-sm font-medium text-red-700 hover:text-red-500 focus:outline-none"
                >
                  I understand and want to continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-2 border-b border-gray-300">
        <TabButton tab="basic" label="Basic Info" />
        <TabButton tab="technical" label="Technical Details" />
        <TabButton tab="analysis" label="Confluences" />
        <TabButton tab="result" label="Result" />
        <TabButton tab="notes" label="Notes & Links" />
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
              <label className="block text-sm font-medium text-gray-700">Trade Link</label>
              <input
                type="text"
                value={formData.tradeLink}
                onChange={(e) => setFormData({ ...formData, tradeLink: e.target.value })}
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
              disabled={loading || (showViolationWarning && !acknowledgedViolations)}
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