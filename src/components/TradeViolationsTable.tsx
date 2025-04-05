import React, { useState, useEffect } from 'react';
import { getTradeViolations, acknowledgeTradeViolation } from '../lib/api';

interface ViolationData {
  id: string;
  tradeId: string;
  userId: string;
  ruleType: string;
  violatedValue: string;
  allowedValues: string[];
  acknowledged: boolean;
  createdAt: string;
  trade?: {
    id: string;
    date: string;
    pair: string;
    action: string;
    profitLoss: number;
  } | null;
}

interface Props {
  userId?: string;
  onSelectTrade?: (tradeId: string) => void;
  className?: string;
}

export default function TradeViolationsTable({ userId, onSelectTrade, className = '' }: Props) {
  const [violations, setViolations] = useState<ViolationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadViolations() {
      try {
        setLoading(true);
        const data = await getTradeViolations(userId);
        setViolations(data);
      } catch (err) {
        console.error('Error loading violations:', err);
        setError('Failed to load trade violations');
      } finally {
        setLoading(false);
      }
    }

    loadViolations();
  }, [userId]);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeTradeViolation(id);
      // Update the local state to reflect the change
      setViolations(violations.map(v => 
        v.id === id ? { ...v, acknowledged: true } : v
      ));
    } catch (err) {
      console.error('Error acknowledging violation:', err);
      setError('Failed to acknowledge violation');
    }
  };

  const formatRuleType = (type: string) => {
    switch (type) {
      case 'pair': return 'Currency Pair';
      case 'day': return 'Trading Day';
      case 'lot': return 'Lot Size';
      case 'action_direction': return 'Against Trend';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-md">
        <p className="text-gray-500">No rule violations found.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pair
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rule Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Violation
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              P/L
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {violations.map((violation) => (
            <tr key={violation.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {violation.trade?.date ? new Date(violation.trade.date).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {violation.trade?.pair || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatRuleType(violation.ruleType)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>
                  <span className="font-medium">Used:</span> {violation.violatedValue}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Allowed:</span> {violation.allowedValues.join(', ')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {violation.acknowledged ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Acknowledged
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${violation.trade?.profitLoss && violation.trade.profitLoss > 0 ? 'text-green-600' : violation.trade?.profitLoss && violation.trade.profitLoss < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {violation.trade?.profitLoss ? violation.trade.profitLoss.toFixed(2) : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2">
                  {onSelectTrade && (
                    <button
                      onClick={() => onSelectTrade(violation.tradeId)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Trade
                    </button>
                  )}
                  {!violation.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(violation.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 