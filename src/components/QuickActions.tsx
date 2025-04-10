import React from 'react';
import { PlusCircle, BarChart2, Calendar } from 'lucide-react';
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
      
      <Link
        to="/calendar"
        className="flex items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        <Calendar className="h-6 w-6 text-indigo-600 mr-2" />
        <span className="text-gray-900 font-medium">Trading Calendar</span>
      </Link>
    </div>
  );
}