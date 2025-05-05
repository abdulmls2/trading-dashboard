import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const navigate = useNavigate();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', isError: true });
      return;
    }
    
    if (password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters', isError: true });
      return;
    }
    
    setLoading(true);
    setMessage({ text: '', isError: false });

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setMessage({ 
        text: 'Password has been updated successfully!', 
        isError: false 
      });
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err) {
      setMessage({ 
        text: err instanceof Error ? err.message : 'An error occurred', 
        isError: true 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <svg width="280" height="64" viewBox="0 0 624 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M79.5568 45.4938H47.2947V34.3428C51.6157 34.7968 55.8096 36.2134 59.4951 38.4291L60.2758 38.9012L67.6651 26.6425L66.8844 26.1703C60.9839 22.6107 54.2301 20.4676 47.2947 19.9773V0H32.9883V21.2849C30.9186 21.8297 28.9033 22.5199 26.9426 23.3371C21.6957 25.5528 16.9753 28.7491 12.9266 32.7991C8.87797 36.849 5.70079 41.5709 3.46768 46.8195C1.16194 52.2679 0 58.0431 0 64C0 69.9569 1.16194 75.7321 3.46768 81.1805C5.68263 86.4291 8.87797 91.151 12.9266 95.2009C16.9753 99.2508 21.6957 102.429 26.9426 104.663C28.9033 105.498 30.9186 106.17 32.9883 106.715V128H47.2947V108.005C54.2119 107.514 60.9657 105.371 66.8844 101.812L67.6651 101.339L60.2758 89.0806L59.4951 89.5528C55.8096 91.7866 51.6157 93.185 47.2947 93.639V82.4881H79.5568V68.1771H32.9883V91.6776C29.2665 90.1884 25.9259 87.9728 23.0392 85.0851C17.411 79.4552 14.3064 71.9728 14.3064 64C14.3064 56.0272 17.411 48.5448 23.0392 42.9149C25.9259 40.0272 29.2665 37.8116 32.9883 36.3224V59.8229H79.5568V45.4938Z" fill="#5454FF" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Set new password</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleUpdatePassword}>
            {message.text && (
              <div className={`px-4 py-3 rounded-md text-sm ${
                message.isError 
                  ? 'bg-red-50 border border-red-200 text-red-600' 
                  : 'bg-green-50 border border-green-200 text-green-600'
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 