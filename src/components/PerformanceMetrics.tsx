import React, { useState } from 'react';
import { PerformanceMetrics as Metrics } from '../types';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

interface Props {
  metrics: Metrics;
}

export default function PerformanceMetrics({ metrics }: Props) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div>
      <button 
        onClick={() => setIsVisible(!isVisible)} 
        className="mb-4 text-blue-500 flex items-center"
      >
        {isVisible ? <FaEyeSlash /> : <FaEye />}
      </button>

      {isVisible && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Trades</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.totalTrades}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.winRate}%</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg. RRR</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{metrics.averageRRR.toFixed(2)}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total P/L</h3>
            <p className={`mt-2 text-3xl font-semibold ${
              metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${metrics.totalProfitLoss.toFixed(2)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Pips</h3>
            <p className={`mt-2 text-3xl font-semibold ${
              metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.totalProfitLoss.toFixed(2)} Pips
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">New Metric 1</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{Math.floor(Math.random() * 100)}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">New Metric 2</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{Math.floor(Math.random() * 100)}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">New Metric 3</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{Math.floor(Math.random() * 100)}</p>
          </div>
        </div>
      )}
    </div>
  );
}