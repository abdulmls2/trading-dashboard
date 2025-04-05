import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userFullName, setUserFullName] = useState('');

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(data?.role === 'admin');
      setUserFullName(data?.full_name || '');
    }

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-indigo-600">CLF Journal</span>
            </Link>
            <nav className="flex space-x-4">
              <Link
                to="/"
                className="text-gray-900 hover:bg-gray-50 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/log-trade"
                className="text-gray-900 hover:bg-gray-50 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Log Trade
              </Link>
              <Link
                to="/performance"
                className="text-gray-900 hover:bg-gray-50 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Performance
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Admin Dashboard
                </Link>
              )}
            </nav>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user && (
              <div className="mr-4 text-sm font-medium text-gray-700">
                Welcome {userFullName}
              </div>
            )}
            <div className="relative ml-3">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <img
                  className="h-8 w-8 rounded-full"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="User avatar"
                />
              </button>

              {isMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center sm:hidden">
            {user && (
              <div className="mr-2 text-sm font-medium text-gray-700">
                Welcome {userFullName}
              </div>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/profile"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Profile Settings
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}