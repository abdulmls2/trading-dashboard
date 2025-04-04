import React, { useState } from 'react';
import { Trade } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
}

export default function TradeHistoryTable({ trades, onSelectTrade }: Props) {
  const [page, setPage] = React.useState(1);
  const [scale, setScale] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(trades.length / itemsPerPage);

  const paginatedTrades = trades.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleZoomIn = () => setScale((prev) => prev + 0.1);
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));

  return (
    <div className="shadow rounded-lg">
      <div className="flex justify-end p-2 bg-transparent">
        <button onClick={handleZoomOut} className="mr-2 text-gray-500" aria-label="Zoom Out">
          <ZoomOut className="h-5 w-5" />
        </button>
        <button onClick={handleZoomIn} className="text-gray-500" aria-label="Zoom In">
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Day</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Entry Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Exit Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Pair</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Direction</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Lots</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SL (pips)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TP (pips)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Risk Ratio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Market Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Pivots</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Banking Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">MA</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">FIB</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Gap</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">True Reward</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Mindset</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Trade Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Comments</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTrades.map((trade, index) => (
              <tr 
                key={trade.id} 
                onClick={() => onSelectTrade(trade)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(page - 1) * itemsPerPage + index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.day}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.entryTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.exitTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.pair}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    trade.action === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.direction}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.lots}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.pipStopLoss}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.pipTakeProfit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.riskRatio}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.orderType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.marketCondition}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.pivots}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.bankingLevel}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.ma}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.fib}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.gap}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.trueReward}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.mindset}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.tradeLink}</td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{trade.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * itemsPerPage, trades.length)}
              </span>{' '}
              of <span className="font-medium">{trades.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                    page === i + 1
                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}