import React from 'react';
import Header from '../components/Header';
import TradeForm from '../components/TradeForm';

export default function LogTrade() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Log New Trade</h1>
          <TradeForm />
        </div>
      </main>
    </div>
  );
}