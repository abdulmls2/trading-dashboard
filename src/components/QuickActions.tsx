import React from 'react';
import { PlusCircle, BarChart2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      <Link
        to="/log-trade"
        className="flex items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <PlusCircle className="h-6 w-6 text-indigo-600 mr-2" />
        <span className="text-gray-900 font-medium">Add Trade</span>
      </Link>

      <Link
        to="/performance"
        className="flex items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <BarChart2 className="h-6 w-6 text-indigo-600 mr-2" />
        <span className="text-gray-900 font-medium">View Performance</span>
      </Link>
      
      <Link // WIP 
        to="/Another-Page"
        className="flex items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <MessageSquare className="h-6 w-6 text-indigo-600 mr-2" />
        <span className="text-gray-900 font-medium">Another Page</span>
      </Link>
    </div>
  );
}