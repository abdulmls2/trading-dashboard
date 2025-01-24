import React from 'react';
import Header from '../components/Header';
import QuickActions from '../components/QuickActions';

export default function Dashboard() {
  const userName = 'Trader'; // This would come from user context/state

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {userName}! Track and improve your trades today.
          </h1>
          <QuickActions />
        </div>
      </main>
    </div>
  );
}