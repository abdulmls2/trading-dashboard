import React, { useState, useEffect } from 'react';
import { PerformanceMetrics as Metrics } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, Percent, DollarSign, BarChart2, Award, Target, Droplet, AlertOctagon } from 'lucide-react';

// Define the expected props, including calculated metrics, DB fields, and the update handler
interface Props {
  metrics: Omit<Metrics, 'monthlyPipTarget' | 'capital'> & { 
    totalPips?: number; 
    maxConsecutiveLosses?: number;
    winningTrades?: number;
    losingTrades?: number;
    breakEvenTrades?: number;
  };
  monthlyPipTarget?: number;
  capital?: number;
  violationsCount?: number;
  violatedTradesCount?: number;
  onUpdateMetrics: (updates: Partial<Pick<Metrics, 'monthlyPipTarget' | 'capital'>>) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

// Currency options
const CURRENCY_OPTIONS = [
  { symbol: '$', code: 'USD' },
  { symbol: '€', code: 'EUR' },
  { symbol: '£', code: 'GBP' },
  { symbol: '¥', code: 'JPY' },
  { symbol: '₹', code: 'INR' },
  { symbol: '₣', code: 'CHF' },
  { symbol: '₩', code: 'KRW' },
  { symbol: 'A$', code: 'AUD' },
  { symbol: 'C$', code: 'CAD' },
];

// Get saved currency from localStorage or use default
const getSavedCurrency = () => {
  try {
    const saved = localStorage.getItem('userCurrency');
    return saved || '$'; // Default to $ if not found
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return '$'; // Fallback to $ on error
  }
};

export default function PerformanceMetricsComponent({ 
  metrics, 
  monthlyPipTarget = 10,
  capital = 100,
  violationsCount = 0,
  violatedTradesCount = 0,
  onUpdateMetrics,
  isLoading,
  readOnly = false
}: Props) {
  const [isEditingPipTarget, setIsEditingPipTarget] = useState(false);
  const [tempPipTarget, setTempPipTarget] = useState(monthlyPipTarget.toString());
  
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [tempCapital, setTempCapital] = useState(capital.toString());
  
  const [isSelectingCurrency, setIsSelectingCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(getSavedCurrency());

  // Update temp state if the prop changes
  React.useEffect(() => {
    setTempPipTarget(monthlyPipTarget.toString());
  }, [monthlyPipTarget]);

  React.useEffect(() => {
    setTempCapital(capital.toString());
  }, [capital]);
  
  // Save currency to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('userCurrency', selectedCurrency);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [selectedCurrency]);
  
  const handleEditPipTarget = () => {
    setTempPipTarget(monthlyPipTarget.toString());
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
      }
    } else {
       setIsEditingPipTarget(false);
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
    setTempCapital(capital.toString());
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
      }
    } else {
      setIsEditingCapital(false);
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

  const handleToggleCurrencySelector = () => {
    setIsSelectingCurrency(!isSelectingCurrency);
  };

  const handleSelectCurrency = (currency: string) => {
    setSelectedCurrency(currency);
    setIsSelectingCurrency(false);
  };

  const totalPips = metrics.totalPips || 0;
  const winRatePercentage = metrics.winRate || 0;
  const pipProgress = Math.min(100, (totalPips / monthlyPipTarget) * 100);
  const capitalReturn = capital > 0 ? (metrics.totalProfitLoss / capital) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview stats with improved UI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Account Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Current Balance</h3>
              <p className="text-2xl font-bold text-gray-900 flex items-center">
                <span 
                  className="mr-1 cursor-pointer hover:text-indigo-600 transition-colors" 
                  onClick={handleToggleCurrencySelector}
                  title="Click to change currency"
                >
                  {selectedCurrency}
                </span>
                {(capital + metrics.totalProfitLoss).toFixed(2)}
              </p>
              {isSelectingCurrency && (
                <div className="absolute mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 z-10">
                  {CURRENCY_OPTIONS.map(currency => (
                    <div 
                      key={currency.code}
                      className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleSelectCurrency(currency.symbol)}
                    >
                      <span className="mr-2 font-medium">{currency.symbol}</span>
                      <span className="text-xs text-gray-500">{currency.code}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center mt-1">
                <span className={`text-sm font-medium ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                  {metrics.totalProfitLoss >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                  {capitalReturn.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-md flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Starting Capital</span>
              {!isEditingCapital ? (
                <div className="flex items-center">
                  <span className="font-medium">{selectedCurrency}{capital}</span>
                  {!readOnly && (
                    <button 
                      onClick={handleEditCapital}
                      className="ml-1 text-gray-400 hover:text-indigo-600"
                      disabled={isLoading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <input
                    type="number"
                    className="w-16 py-0 px-1 border border-gray-300 rounded text-xs text-gray-900"
                    value={tempCapital}
                    onChange={(e) => setTempCapital(e.target.value)}
                    onKeyDown={handleCapitalKeyDown}
                    autoFocus
                    min="0"
                    disabled={isLoading}
                  />
                  <div className="flex ml-1">
                    <button onClick={handleSaveCapital} className="text-green-500 hover:text-green-700 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button onClick={handleCancelCapital} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${metrics.totalProfitLoss >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ 
                  width: `${Math.min(100, Math.max(0, Math.abs(capitalReturn)))}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Total P/L Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Profit/Loss</h3>
              <p className={`text-2xl font-bold ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedCurrency}{metrics.totalProfitLoss.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total from {metrics.totalTrades} trades</p>
            </div>
            <div className={`h-10 w-10 ${metrics.totalProfitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-md flex items-center justify-center`}>
              {metrics.totalProfitLoss >= 0 ? 
                <TrendingUp className={`h-5 w-5 ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} /> :
                <TrendingDown className={`h-5 w-5 ${metrics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              }
            </div>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Win Rate</h3>
              <p className="text-2xl font-bold text-gray-900">{winRatePercentage}%</p>
              <p className="text-sm text-gray-500 mt-1">
                {metrics.winningTrades || 0}W / {metrics.losingTrades || 0}L / {metrics.breakEvenTrades || 0}BE
              </p>
            </div>
            <div className="h-10 w-10 bg-purple-50 rounded-md flex items-center justify-center">
              <Percent className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          
          {/* Compact win/loss distribution */}
          {metrics.totalTrades > 0 && (
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="flex h-full">
                  <div 
                    className="bg-green-500 h-full" 
                    style={{ width: `${((metrics.winningTrades || 0) / metrics.totalTrades) * 100}%` }} 
                  />
                  <div 
                    className="bg-red-500 h-full" 
                    style={{ width: `${((metrics.losingTrades || 0) / metrics.totalTrades) * 100}%` }} 
                  />
                  <div 
                    className="bg-gray-400 h-full" 
                    style={{ width: `${((metrics.breakEvenTrades || 0) / metrics.totalTrades) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pips and Target Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Pips</h3>
              <p className="text-2xl font-bold text-gray-900">{totalPips.toFixed(1)}</p>
              
              {!isEditingPipTarget ? (
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-500">Target: {monthlyPipTarget}</span>
                  {!readOnly && (
                    <button 
                      onClick={handleEditPipTarget}
                      className="ml-1 text-gray-400 hover:text-indigo-600"
                      aria-label="Edit monthly pip target"
                      disabled={isLoading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-500 mr-1">Target:</span>
                  <input
                    type="number"
                    className="w-12 py-0 px-1 border border-gray-300 rounded text-xs text-gray-900"
                    value={tempPipTarget}
                    onChange={(e) => setTempPipTarget(e.target.value)}
                    onKeyDown={handlePipTargetKeyDown}
                    autoFocus
                    min="0"
                    disabled={isLoading}
                  />
                  <div className="flex ml-1">
                    <button onClick={handleSavePipTarget} className="text-green-500 hover:text-green-700 mr-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button onClick={handleCancelPipTarget} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="h-10 w-10 bg-teal-50 rounded-md flex items-center justify-center">
              <Droplet className="h-5 w-5 text-teal-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span className="font-medium">{pipProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${totalPips >= monthlyPipTarget ? 'bg-teal-500' : 'bg-blue-500'}`}
                style={{ width: `${pipProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary stats with improved UI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* True Reward Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">True Reward</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageRRR.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">Total R:R ratio</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-md flex items-center justify-center">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Trades Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Total Trades</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalTrades}</p>
              <p className="text-sm text-gray-500 mt-1">All recorded trades</p>
            </div>
            <div className="h-10 w-10 bg-gray-50 rounded-md flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Max Consecutive Losses Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Max Consecutive Losses</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.maxConsecutiveLosses}</p>
              <p className="text-sm text-gray-500 mt-1">Losing streak</p>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-md flex items-center justify-center">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Violations Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Violations</h3>
              <p className="text-2xl font-bold text-gray-900 flex items-center">
                {violationsCount > 0 && (
                  <AlertTriangle className="h-5 w-5 mr-1 text-amber-500" />
                )}
                {violatedTradesCount}
              </p>
              {violationsCount > 0 ? (
                <p className="text-sm text-red-500 mt-1">
                  {violationsCount} rule violations
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">No rule violations</p>
              )}
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-md flex items-center justify-center">
              <AlertOctagon className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}