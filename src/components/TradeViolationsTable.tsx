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
  user?: {
    email: string;
    fullName: string | null;
    username: string | null;
  } | null;
}

interface Props {
  userId?: string;
  onSelectTrade?: (tradeId: string) => void;
  className?: string;
  showAll?: boolean;
}

export default function TradeViolationsTable({ userId, onSelectTrade, className = '', showAll = false }: Props) {
  const [violations, setViolations] = useState<ViolationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadViolations() {
      try {
        setLoading(true);
        const data = await getTradeViolations(userId, showAll);
        setViolations(data);
      } catch (err) {
        console.error('Error loading violations:', err);
        setError('Failed to load trade violations');
      } finally {
        setLoading(false);
      }
    }

    loadViolations();
  }, [userId, showAll]);

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
            {showAll && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
            )}
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
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {violations.map((violation) => (
            <tr key={violation.id}>
              {showAll && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {violation.user?.fullName || violation.user?.email || 'Unknown User'}
                </td>
              )}
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2">
                  {onSelectTrade && (
                    <button
                      onClick={() => {
                        console.log('View Trade clicked for trade:', violation.tradeId);
                        onSelectTrade(violation.tradeId);
                      }}
                      className="px-3 py-1 bg-indigo-100 rounded text-indigo-700 hover:bg-indigo-200 transition-colors flex items-center"
                      title="View complete trade details"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
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