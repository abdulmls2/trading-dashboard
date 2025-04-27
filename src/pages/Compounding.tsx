import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react'; // Using TrendingUp, change if needed

interface PlanMonth {
  month: number;
  startingCapital: number;
  amountRisked: number;
  valuePerPip: number;
  lotSize: number; // Standard lots
  profitForMonth: number;
  endingCapital: number;
}

const Compounding: React.FC = () => {
  const [startCapital, setStartCapital] = useState<number | ''>('');
  const [riskPercent, setRiskPercent] = useState<number | ''>('');
  const [pipsTarget, setPipsTarget] = useState<number | ''>('');
  const [stopLossPips, setStopLossPips] = useState<number | ''>('');
  const [durationMonths, setDurationMonths] = useState<number | ''>('');
  const [plan, setPlan] = useState<PlanMonth[]>([]);
  const [error, setError] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState('$'); // Default to $

  // --- Load Plan from LocalStorage --- 
  useEffect(() => {
    try {
      const savedPlanString = localStorage.getItem('compoundingPlan');
      if (savedPlanString) {
        const savedPlan = JSON.parse(savedPlanString);
        // Optional: Add some validation here to ensure it's an array of PlanMonth
        if (Array.isArray(savedPlan)) {
          setPlan(savedPlan);
        }
      }
    } catch (error) {
      console.error("Error reading or parsing compounding plan from localStorage:", error);
      localStorage.removeItem('compoundingPlan'); // Clear potentially corrupted data
    }
  }, []); // Run only on mount

  // Fetch currency from localStorage on mount
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem('userCurrency');
      if (savedCurrency) {
        setSelectedCurrency(savedCurrency);
      }
    } catch (error) {
      console.error("Error accessing localStorage for currency:", error);
      // Keep default currency if localStorage fails
    }

    // Optional: Add event listener to sync across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userCurrency' && event.newValue) {
        setSelectedCurrency(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const generatePlan = () => {
    setError('');
    setPlan([]); // Clear previous plan on new generation

    if (
      startCapital === '' || riskPercent === '' || pipsTarget === '' ||
      stopLossPips === '' || durationMonths === '' ||
      startCapital <= 0 || riskPercent <= 0 || riskPercent > 100 ||
      pipsTarget <= 0 || stopLossPips <= 0 || durationMonths <= 0
    ) {
      setError('Please fill in all fields with valid positive numbers (Risk % between 0.01 and 100).');
      return;
    }

    const calculatedPlan: PlanMonth[] = [];
    let currentCapital = startCapital as number;

    for (let month = 1; month <= durationMonths; month++) {
      const amountRisked = currentCapital * (riskPercent as number / 100);
      // Ensure stopLossPips is not zero to avoid division by zero
      const valuePerPip = stopLossPips > 0 ? amountRisked / (stopLossPips as number) : 0;
      const lotSize = valuePerPip / 10; // Assuming $10/pip per standard lot
      const profitForMonth = (pipsTarget as number) * valuePerPip;
      const endingCapital = currentCapital + profitForMonth;

      calculatedPlan.push({
        month,
        startingCapital: currentCapital,
        amountRisked,
        valuePerPip,
        lotSize,
        profitForMonth,
        endingCapital,
      });

      currentCapital = endingCapital;
    }

    setPlan(calculatedPlan);

    // --- Save Plan to LocalStorage ---
    try {
        localStorage.setItem('compoundingPlan', JSON.stringify(calculatedPlan));
    } catch (error) {
        console.error("Error saving compounding plan to localStorage:", error);
        // Optionally notify the user that the plan couldn't be saved
        setError(prev => prev ? `${prev} (Plan could not be saved locally)` : 'Plan could not be saved locally');
    }
  };

  const formatCurrency = (value: number) => {
    if (!isFinite(value)) {
      return 'N/A';
    }
    // Format the number using the browser's locale for separators
    const formattedNumber = value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // Prepend the selected currency symbol
    return `${selectedCurrency}${formattedNumber}`;
  };

  const formatNumber = (value: number, decimals: number = 2) => {
      if (!isFinite(value)) {
         return 'N/A';
      }
      return value.toFixed(decimals);
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* <PageTitle title="Compounding Plan Generator" icon={TrendingUp} /> */}
      {/* Use a simple h1 for now */}
      <h1 className="text-2xl font-semibold mb-6 flex items-center">
        <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
        Compounding Plan Generator
      </h1>

      {/* Input Form Card */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Enter Plan Details</h2>
        <form onSubmit={(e) => { e.preventDefault(); generatePlan(); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Starting Capital */}
          <div>
            <label htmlFor="startCapital" className="block text-sm font-medium text-gray-700 mb-1">Starting Capital ({selectedCurrency})</label>
            <input
              type="number"
              id="startCapital"
              value={startCapital}
              onChange={(e) => setStartCapital(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 10000"
              min="0.01" step="any" // Allow decimals
              required
            />
          </div>

          {/* Risk Percentage */}
          <div>
            <label htmlFor="riskPercent" className="block text-sm font-medium text-gray-700 mb-1">Risk per Trade (%)</label>
            <input
              type="number"
              id="riskPercent"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 1 or 2"
              min="0.01" max="100" step="any" // Allow decimals
              required
            />
          </div>

          {/* Monthly Pips Target */}
          <div>
            <label htmlFor="pipsTarget" className="block text-sm font-medium text-gray-700 mb-1">Monthly Pips Target</label>
            <input
              type="number"
              id="pipsTarget"
              value={pipsTarget}
              onChange={(e) => setPipsTarget(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 200"
              min="1" step="1"
              required
            />
          </div>

          {/* Stop Loss (Pips) */}
           <div>
            <label htmlFor="stopLossPips" className="block text-sm font-medium text-gray-700 mb-1">Stop Loss (pips)</label>
            <input
              type="number"
              id="stopLossPips"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 20"
              min="1" step="1"
              required
            />
          </div>

          {/* Plan Duration (Months) */}
          <div>
            <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700 mb-1">Plan Duration (Months)</label>
            <input
              type="number"
              id="durationMonths"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 12"
              min="1" step="1"
              required
            />
          </div>

          {/* Submit Button & Error Message */}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row justify-end items-center pt-4 gap-4">
             {error && <p className="text-red-600 text-sm text-center sm:text-right w-full sm:w-auto">{error}</p>}
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate Plan
            </button>
          </div>
        </form>
      </div>

      {/* Results Table Card */}
      {plan.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Compounding Plan Projection</h2>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Capital</th>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Amount</th>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">$/Pip</th>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot Size*</th>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Profit</th>
                     <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Capital</th>
                   </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plan.map((item) => (
                    <tr key={item.month} className="hover:bg-gray-50 transition-colors duration-150">
                       <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.month}</td>
                       <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.startingCapital)}</td>
                       <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.amountRisked)}</td>
                       <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.valuePerPip)}</td>
                       <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatNumber(item.lotSize, 2)}</td>
                       <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm ${item.profitForMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.profitForMonth)}</td>
                       <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(item.endingCapital)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compounding; 