import React, { useState } from 'react';
import TradeForm from '../components/TradeForm';

export default function LogTrade() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleClose = () => {
    console.log("Trade form closed/submitted on LogTrade page.");
    setShowSuccessMessage(true);
    // You might want to add navigation logic here, e.g., navigate back or to a success page
    // Or set a timer to hide the success message after a few seconds
    // setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Log New Trade</h1>
          {showSuccessMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> Trade logged successfully.</span>
              <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setShowSuccessMessage(false)}>
                <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
              </span>
            </div>
          )}
          <TradeForm onClose={handleClose} />
        </div>
      </main>
    </div>
  );
}