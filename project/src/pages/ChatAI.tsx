import React from 'react';
import Header from '../components/Header';
import AIChatBox from '../components/AIChatBox';

export default function ChatAI() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">AI Trading Assistant</h1>
          <AIChatBox />
        </div>
      </main>
    </div>
  );
}