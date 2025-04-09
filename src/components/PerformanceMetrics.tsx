import React, { useState } from 'react';
import { PerformanceMetrics as Metrics } from '../types';
import { AlertTriangle } from 'lucide-react';

// Define the expected props, including calculated metrics, DB fields, and the update handler
interface Props {
  metrics: Omit<Metrics, 'monthlyPipTarget' | 'capital'> & { totalPips?: number };
  monthlyPipTarget?: number;
  capital?: number;
  violationsCount?: number;
  onUpdateMetrics: (updates: Partial<Pick<Metrics, 'monthlyPipTarget' | 'capital'>>) => Promise<void>;
  isLoading?: boolean; // Optional loading state
}

export default function PerformanceMetricsComponent({ 
  metrics, 
  monthlyPipTarget = 10, // Provide default if undefined
  capital = 100,      // Provide default if undefined
  violationsCount = 0,
  onUpdateMetrics,
  isLoading // Destructure isLoading 
}: Props) {
  // Local state only for the editing UI, not the values themselves
  const [isEditingPipTarget, setIsEditingPipTarget] = useState(false);
  const [tempPipTarget, setTempPipTarget] = useState(monthlyPipTarget.toString());
  
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [tempCapital, setTempCapital] = useState(capital.toString());

  // Update temp state if the prop changes (e.g., after successful save)
  React.useEffect(() => {
    setTempPipTarget(monthlyPipTarget.toString());
  }, [monthlyPipTarget]);

  React.useEffect(() => {
    setTempCapital(capital.toString());
  }, [capital]);
  
  const handleEditPipTarget = () => {
    setTempPipTarget(monthlyPipTarget.toString()); // Start edit with current prop value
    setIsEditingPipTarget(true);
  };

  const handleSavePipTarget = async () => {
    const newTarget = parseInt(tempPipTarget);
    if (!isNaN(newTarget) && newTarget >= 0) {
      try {
        await onUpdateMetrics({ monthlyPipTarget: newTarget });
        setIsEditingPipTarget(false);
      } catch (error) {
        console.error("Failed to update pip target:", error);
        // Optionally show an error message to the user
      }
    } else {
       setIsEditingPipTarget(false); // Close editor even if invalid
    }
  };

  const handleCancelPipTarget = () => {
    setIsEditingPipTarget(false);
  };

  const handlePipTargetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePipTarget();
    } else if (e.key === 'Escape') {
      handleCancelPipTarget();
    }
  };
  
  const handleEditCapital = () => {
    setTempCapital(capital.toString()); // Start edit with current prop value
    setIsEditingCapital(true);
  };

  const handleSaveCapital = async () => {
    const newCapital = parseInt(tempCapital);
    if (!isNaN(newCapital) && newCapital >= 0) {
       try {
        await onUpdateMetrics({ capital: newCapital });
        setIsEditingCapital(false);
      } catch (error) {
        console.error("Failed to update capital:", error);
        // Optionally show an error message to the user
      }
    } else {
      setIsEditingCapital(false); // Close editor even if invalid
    }
  };

  const handleCancelCapital = () => {
    setIsEditingCapital(false);
  };

  const handleCapitalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCapital();
    } else if (e.key === 'Escape') {
      handleCancelCapital();
    }
  };

  const totalPips = metrics.totalPips || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Display calculated metrics from props */}
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
          <p className={`mt-2 text-3xl font-bold ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${metrics.totalProfitLoss.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">True TP/SL (Pips)</h3>
        <div className="flex items-baseline">
          <p className={`mt-2 text-3xl font-bold ${totalPips >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {totalPips.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Monthly Pip Target - Use prop value, trigger update on save */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">Monthly Pip Target</h3>
        <div className="flex items-baseline justify-between">
          {isEditingPipTarget ? (
            <div className="flex items-center mt-2">
              <input
                type="number"
                className="w-16 p-1 border border-gray-300 rounded text-xl font-bold text-gray-900"
                value={tempPipTarget}
                onChange={(e) => setTempPipTarget(e.target.value)}
                onKeyDown={handlePipTargetKeyDown}
                autoFocus
                min="0"
                disabled={isLoading} // Disable input while loading/updating
              />
              <div className="flex ml-2">
                <button 
                  onClick={handleSavePipTarget}
                  className="text-green-500 hover:text-green-700 mr-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={handleCancelPipTarget}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{monthlyPipTarget}</p>
          )}
          {!isEditingPipTarget && (
            <button 
              onClick={handleEditPipTarget}
              className="text-gray-400 hover:text-indigo-600"
              aria-label="Edit monthly pip target"
              disabled={isLoading} // Disable button while loading/updating
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="mt-2">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Progress</span>
            <span className="font-medium">{Math.min(100, (totalPips / monthlyPipTarget) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${totalPips >= monthlyPipTarget ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, (totalPips / monthlyPipTarget) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Capital - Use prop value, trigger update on save */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-400">
        <h3 className="text-sm font-medium text-gray-500 uppercase">Capital</h3>
        <div className="flex items-baseline justify-between">
          {isEditingCapital ? (
            <div className="flex items-center mt-2">
              <input
                type="number"
                className="w-24 p-1 border border-gray-300 rounded text-xl font-bold text-gray-900"
                value={tempCapital}
                onChange={(e) => setTempCapital(e.target.value)}
                onKeyDown={handleCapitalKeyDown}
                autoFocus
                min="0"
                disabled={isLoading} // Disable input while loading/updating
              />
              <div className="flex ml-2">
                <button 
                  onClick={handleSaveCapital}
                  className="text-green-500 hover:text-green-700 mr-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={handleCancelCapital}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">${capital}</p>
          )}
          {!isEditingCapital && (
            <button 
              onClick={handleEditCapital}
              className="text-gray-400 hover:text-teal-600"
              aria-label="Edit capital"
              disabled={isLoading} // Disable button while loading/updating
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-2">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Return</span>
            {capital > 0 && (
              <span className={`font-medium ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {((metrics.totalProfitLoss / capital) * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${metrics.totalProfitLoss >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ 
                width: `${capital > 0 ? Math.min(100, Math.max(0, ((Math.abs(metrics.totalProfitLoss) / capital) * 100))) : 0}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 uppercase">New Metric 3</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900">71</p>
        </div>
      </div>

      {/* Violated Trades - Use prop value */}
      <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400 col-span-1 md:col-span-2"> {/* Adjusted span */}
        <h3 className="text-sm font-medium text-gray-500 uppercase">Violated Trades</h3>
        <div className="flex items-baseline">
          <p className="mt-2 text-3xl font-bold text-gray-900 flex items-center">
            {violationsCount > 0 && (
              <span className="mr-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
              </span>
            )}
            {violationsCount}
          </p>
        </div>
      </div>
    </div>
  );
}