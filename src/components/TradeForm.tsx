import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { createTrade, updateTrade } from '../lib/api';

// Extend the Trade type with the missing properties
interface ExtendedTrade extends Trade {
  day?: string;
  direction?: string;
  orderType?: string;
  marketCondition?: string;
  ma?: string;
  fib?: string;
  gap?: string;
  mindset?: string;
  tradeLink?: string;
  trueReward?: string;
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
  existingTrade?: ExtendedTrade;
}

type TabType = 'basic' | 'technical' | 'analysis' | 'result' | 'notes';

export default function TradeForm({ onClose, existingTrade }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = React.useState<Partial<ExtendedTrade>>(
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
    }
  );

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

  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (existingTrade) {
        await updateTrade(existingTrade.id, submissionData);
      } else {
        await createTrade(submissionData as Omit<ExtendedTrade, 'id'>);
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
    });
    setActiveTab('basic');
  };

  const inputClassName = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-blue-50";
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Day</label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className={selectClassName}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Exit Time</label>
              <input
                type="time"
                value={formData.exitTime}
                onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                className={inputClassName}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Stop Loss (pips)</label>
              <input
                type="number"
                value={formData.pipStopLoss}
                onChange={(e) => setFormData({ ...formData, pipStopLoss: parseInt(e.target.value) })}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Take Profit (pips)</label>
              <input
                type="number"
                value={formData.pipTakeProfit}
                onChange={(e) => setFormData({ ...formData, pipTakeProfit: parseInt(e.target.value) })}
                className={inputClassName}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Order Type</label>
              <select
                value={formData.orderType}
                onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                className={selectClassName}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Market Condition</label>
              <select
                value={formData.marketCondition}
                onChange={(e) => setFormData({ ...formData, marketCondition: e.target.value })}
                className={selectClassName}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Trade Link</label>
              <input
                type="text"
                value={formData.tradeLink}
                onChange={(e) => setFormData({ ...formData, tradeLink: e.target.value })}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Profit/Loss</label>
              <input
                type="number"
                step="0.01"
                value={formData.profitLoss}
                onChange={(e) => setFormData({ ...formData, profitLoss: parseFloat(e.target.value) })}
                className={inputClassName}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={4}
                className={inputClassName}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-8">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : existingTrade ? 'Update Trade' : 'Submit Trade'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}