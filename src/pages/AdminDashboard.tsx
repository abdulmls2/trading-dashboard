import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Trade {
  id: string;
  date: string;
  pair: string;
  action: string;
  entry_time: string;
  exit_time: string;
  lots: number;
  pip_stop_loss: number;
  pip_take_profit: number;
  profit_loss: number;
  comments: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserTrades, setSelectedUserTrades] = useState<Trade[]>([]);
  const [showTradesModal, setShowTradesModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  useEffect(() => {
    async function checkAdminAndLoadUsers() {
      if (!user) return;

      // Check if current user is admin
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || currentUserProfile?.role !== 'admin') {
        navigate('/');
        return;
      }

      // Fetch all normal users
      const { data: userProfiles, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'normal')
        .order('created_at', { ascending: false });

      if (usersError) {
        setError('Failed to load users');
        setLoading(false);
        return;
      }

      setProfiles(userProfiles);
      setLoading(false);
    }

    checkAdminAndLoadUsers();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        </main>
      </div>
    );
  }

  const handleViewTrades = async (userId: string, email: string) => {
    try {
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (tradesError) throw tradesError;

      setSelectedUserTrades(trades || []);
      setSelectedUserEmail(email);
      setShowTradesModal(true);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trades');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            User Management
          </h1>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.username || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewTrades(profile.user_id, profile.email)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View Trades
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Trades Modal */}
          {showTradesModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Trades for {selectedUserEmail}
                  </h2>
                  <button
                    onClick={() => setShowTradesModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-6 py-4 overflow-auto max-h-[calc(80vh-8rem)]">
                  {selectedUserTrades.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pair</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exit Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedUserTrades.map((trade) => (
                          <tr key={trade.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(trade.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.pair}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  trade.action === 'Buy'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {trade.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.entry_time}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.exit_time}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`font-medium ${
                                  trade.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No trades found for this user</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
