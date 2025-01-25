import React from 'react';
import { Trade } from '../types';
import { createTrade, updateTrade } from '../lib/api';

const currencyPairs = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
];

interface Props {
  onClose: () => void;
  existingTrade?: Trade;
}

export default function TradeForm({ onClose, existingTrade }: Props) {
  const [formData, setFormData] = React.useState<Partial<Trade>>(
    existingTrade || {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      pair: 'EUR/USD',
      action: 'Buy',
      entryTime: '',
      exitTime: '',
      lots: 0.01,
      pipStopLoss: 0,
      pipTakeProfit: 0,
      profitLoss: 0,
      pivots: '',
      bankingLevel: '',
      riskRatio: 0,
      comments: '',
    }
  );

  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (existingTrade) {
        await updateTrade(existingTrade.id, formData);
      } else {
        await createTrade(formData as Omit<Trade, 'id'>);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the trade');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      pair: 'EUR/USD',
      action: 'Buy',
      entryTime: '',
      exitTime: '',
      lots: 0.01,
      pipStopLoss: 0,
      pipTakeProfit: 0,
      profitLoss: 0,
      pivots: '',
      bankingLevel: '',
      riskRatio: 0,
      comments: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Pair</label>
          <select
            value={formData.pair}
            onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Exit Time</label>
          <input
            type="time"
            value={formData.exitTime}
            onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Lots</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.lots}
            onChange={(e) => setFormData({ ...formData, lots: parseFloat(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Stop Loss (pips)</label>
          <input
            type="number"
            value={formData.pipStopLoss}
            onChange={(e) => setFormData({ ...formData, pipStopLoss: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Take Profit (pips)</label>
          <input
            type="number"
            value={formData.pipTakeProfit}
            onChange={(e) => setFormData({ ...formData, pipTakeProfit: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Profit/Loss</label>
          <input
            type="number"
            step="0.01"
            value={formData.profitLoss}
            onChange={(e) => setFormData({ ...formData, profitLoss: parseFloat(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Pivots</label>
          <input
            type="text"
            value={formData.pivots}
            onChange={(e) => setFormData({ ...formData, pivots: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="e.g., Daily High, Weekly Low"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Banking Level</label>
          <input
            type="text"
            value={formData.bankingLevel}
            onChange={(e) => setFormData({ ...formData, bankingLevel: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="e.g., Major Support, Key Resistance"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Risk Ratio</label>
          <input
            type="number"
            step="0.1"
            value={formData.riskRatio}
            onChange={(e) => setFormData({ ...formData, riskRatio: parseFloat(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Comments</label>
        <textarea
          value={formData.comments}
          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end space-x-4">
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
    </form>
  );
}