import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import TradeHistoryTable from '../components/TradeHistoryTable';
import { Trade as TradeType } from '../types';
import TradeForm from '../components/TradeForm';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  last_trade_date?: string;
}

// Interface for database trade records
interface DbTrade {
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
  user_id?: string;
  day?: string;
  direction?: string;
  risk_ratio?: number;
  order_type?: string;
  market_condition?: string;
  pivots?: string;
  banking_level?: string;
  ma?: string;
  fib?: string;
  gap?: string;
  true_reward?: string;
  true_tp_sl?: string;
  mindset?: string;
  trade_link?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserTrades, setSelectedUserTrades] = useState<TradeType[]>([]);
  const [showTradesModal, setShowTradesModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserFullName, setSelectedUserFullName] = useState('');
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeType | null>(null);

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

      // Get the last trade date for each user
      const enhancedProfiles = await Promise.all(
        userProfiles.map(async (profile) => {
          // Get the most recent trade for this user
          const { data: latestTrade, error: tradeError } = await supabase
            .from('trades')
            .select('date')
            .eq('user_id', profile.user_id)
            .order('date', { ascending: false })
            .limit(1);

          if (tradeError || !latestTrade || latestTrade.length === 0) {
            return { ...profile, last_trade_date: null };
          }

          return { ...profile, last_trade_date: latestTrade[0].date };
        })
      );

      setProfiles(enhancedProfiles);
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

  const handleViewTrades = async (userId: string, email: string, fullName: string | null) => {
    try {
      setSelectedUserId(userId);
      setSelectedUserEmail(email);
      setSelectedUserFullName(fullName || email); // Use email as fallback if no name
      
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (tradesError) throw tradesError;

      // Format trades from database format to TradeHistoryTable's expected format
      const formattedTrades: TradeType[] = (trades || []).map((trade: DbTrade) => ({
        id: trade.id,
        userId: trade.user_id || '',
        date: trade.date,
        time: trade.entry_time, // Using entry_time as time
        pair: trade.pair,
        action: trade.action as 'Buy' | 'Sell',
        entryTime: trade.entry_time,
        exitTime: trade.exit_time,
        lots: trade.lots,
        pipStopLoss: trade.pip_stop_loss,
        pipTakeProfit: trade.pip_take_profit,
        profitLoss: trade.profit_loss,
        pivots: trade.pivots || '',
        bankingLevel: trade.banking_level || '',
        riskRatio: trade.risk_ratio || 0,
        comments: trade.comments,
        day: trade.day || '',
        direction: trade.direction || '',
        orderType: trade.order_type || '',
        marketCondition: trade.market_condition || '',
        ma: trade.ma || '',
        fib: trade.fib || '',
        gap: trade.gap || '',
        mindset: trade.mindset || '',
        tradeLink: trade.trade_link || '',
        trueReward: trade.true_reward || '',
        true_tp_sl: trade.true_tp_sl || ''
      }));

      setSelectedUserTrades(formattedTrades);
      setShowTradesModal(true);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trades');
    }
  };

  // Handler for when a trade is selected in the table
  const handleSelectTrade = (trade: TradeType) => {
    setSelectedTrade(trade);
    setShowTradeForm(true);
  };

  // Handle closing the trade form
  const handleTradeFormClose = () => {
    setShowTradeForm(false);
    setSelectedTrade(null);
    
    // Refresh the trades list if we're viewing trades
    if (showTradesModal && selectedUserId) {
      refreshUserTrades(selectedUserId);
    }
  };

  const refreshUserTrades = async (userId: string) => {
    console.log("Refreshing trades for user:", userId);
    try {
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (tradesError) throw tradesError;

      console.log("Fetched trades:", trades?.length || 0);

      // Format trades from database format to TradeHistoryTable's expected format
      const formattedTrades: TradeType[] = (trades || []).map((trade: DbTrade) => ({
        id: trade.id,
        userId: trade.user_id || '',
        date: trade.date,
        time: trade.entry_time, // Using entry_time as time
        pair: trade.pair,
        action: trade.action as 'Buy' | 'Sell',
        entryTime: trade.entry_time,
        exitTime: trade.exit_time,
        lots: trade.lots,
        pipStopLoss: trade.pip_stop_loss,
        pipTakeProfit: trade.pip_take_profit,
        profitLoss: trade.profit_loss,
        pivots: trade.pivots || '',
        bankingLevel: trade.banking_level || '',
        riskRatio: trade.risk_ratio || 0,
        comments: trade.comments,
        day: trade.day || '',
        direction: trade.direction || '',
        orderType: trade.order_type || '',
        marketCondition: trade.market_condition || '',
        ma: trade.ma || '',
        fib: trade.fib || '',
        gap: trade.gap || '',
        mindset: trade.mindset || '',
        tradeLink: trade.trade_link || '',
        trueReward: trade.true_reward || '',
        true_tp_sl: trade.true_tp_sl || ''
      }));

      console.log("Setting formatted trades:", formattedTrades.length);
      setSelectedUserTrades(formattedTrades);
    } catch (err) {
      console.error('Error refreshing trades:', err);
      setError('Failed to refresh trades');
    }
  };

  const handleExitFullscreen = () => {
    setShowTradesModal(false);
  };

  // Render the user management table if not showing trades
  if (!showTradesModal) {
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
                      Last Journaled
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.last_trade_date 
                          ? new Date(profile.last_trade_date).toLocaleDateString() 
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleViewTrades(profile.user_id, profile.email, profile.full_name)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View Journal
                        </button>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render the trade history in fullscreen mode
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="mt-16 flex-grow px-4 pb-4">
        <div className="TradeHistoryTableWrapper h-full">
          {/* Set a large min-height to ensure the table fills the available space */}
          <div style={{ minHeight: 'calc(100vh - 80px)' }}>
            <TradeHistoryTable 
              trades={selectedUserTrades} 
              onSelectTrade={handleSelectTrade}
              forcedFullScreen={true}
              targetUserId={selectedUserId}
              onExitFullscreen={handleExitFullscreen}
              journalOwnerName={selectedUserFullName}
            />
          </div>
        </div>
      </div>

      {/* Trade Form Modal */}
      {showTradeForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTrade ? 'Edit Trade for ' : 'View Trade Details for '}{selectedUserFullName}
                </h2>
                <button
                  onClick={handleTradeFormClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <TradeForm 
                onClose={handleTradeFormClose}
                existingTrade={selectedTrade || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
