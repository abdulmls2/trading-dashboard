import React from 'react';
import { PerformanceMetrics as Metrics } from '../types';

interface Props {
  metrics: Metrics & { totalPips?: number };
}

export default function PerformanceMetrics({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">Total Trades</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.totalTrades}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">Win Rate</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.winRate}%</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">True Reward</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.averageRRR.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">Total P/L</h3>
        <div className="flex items-baseline">
          <p className={`mt-2 text-3xl font-bold ${
            metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${metrics.totalProfitLoss.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">True TP/SL</h3>
        <div className="flex items-baseline">
          <p className={`mt-2 text-3xl font-bold ${
            (metrics.totalPips || 0) >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {(metrics.totalPips || 0).toFixed(1)}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 uppercase">New Metric 1</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">10</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 uppercase">New Metric 2</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">34</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 uppercase">New Metric 3</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">71</p>
        </div>
      </div>
    </div>
  );
}