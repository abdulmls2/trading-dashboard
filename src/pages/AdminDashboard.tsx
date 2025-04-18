import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import TradeHistoryTable from '../components/TradeHistoryTable';
import { Trade as TradeType } from '../types';
import TradeForm from '../components/TradeForm';
import UserTradingRulesForm from '../components/UserTradingRulesForm';
import TradeViolationsTable from '../components/TradeViolationsTable';

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
  additional_confluences?: string;
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showViolationsModal, setShowViolationsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'violations'>('users');
  const [editMode, setEditMode] = useState(false);

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

  // Sort profiles by last journaled date
  const sortByLastJournaled = () => {
    const newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newSortDirection);
    
    const sortedProfiles = [...profiles].sort((a, b) => {
      // Handle null values (users who never journaled)
      if (!a.last_trade_date && !b.last_trade_date) return 0;
      if (!a.last_trade_date) return newSortDirection === 'asc' ? -1 : 1;
      if (!b.last_trade_date) return newSortDirection === 'asc' ? 1 : -1;
      
      // Compare dates
      const dateA = new Date(a.last_trade_date).getTime();
      const dateB = new Date(b.last_trade_date).getTime();
      
      return newSortDirection === 'asc' 
        ? dateA - dateB 
        : dateB - dateA;
    });
    
    setProfiles(sortedProfiles);
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </main>
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
        true_tp_sl: trade.true_tp_sl || '',
        additional_confluences: trade.additional_confluences || ''
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
    setEditMode(true);
    setShowTradeForm(true);
  };

  // Handle closing the trade form
  const handleTradeFormClose = () => {
    setShowTradeForm(false);
    setSelectedTrade(null);
    setEditMode(false);
    
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
        true_tp_sl: trade.true_tp_sl || '',
        additional_confluences: trade.additional_confluences || ''
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

  const handleDeleteTrades = async (tradeIds: string[]) => {
    if (selectedUserId) {
      // Refresh trades for the current user
      refreshUserTrades(selectedUserId);
    }
  };

  const handleManageRules = (userId: string, email: string, fullName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setSelectedUserFullName(fullName || email);
    setShowRulesModal(true);
  };

  const handleViewViolations = (userId: string, email: string, fullName: string | null) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setSelectedUserFullName(fullName || email);
    setShowViolationsModal(true);
  };

  // Handle when a user's trading rules are updated
  const handleRulesUpdated = () => {
    // You could refresh user data or show a notification here
    console.log('Trading rules updated for', selectedUserEmail);
  };

  // Handle selecting a trade from violations table
  const handleSelectViolationTrade = async (tradeId: string) => {
    // First check if the trade is already in the current selection
    const trade = selectedUserTrades.find(t => t.id === tradeId);
    
    if (trade) {
      setSelectedTrade(trade);
      setEditMode(false);
      setShowTradeForm(true);
    } else {
      // Trade is not in the current selection, need to fetch it
      try {
        console.log('Fetching trade:', tradeId);
        
        // Fetch the specific trade from the database
        const { data: tradeData, error } = await supabase
          .from('trades')
          .select('*')
          .eq('id', tradeId)
          .single();
        
        if (error) {
          console.error('Error fetching trade data:', error);
          throw error;
        }
        
        if (tradeData) {
          // Now fetch the profile data separately
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', tradeData.user_id)
            .single();
            
          console.log('Fetched trade data:', tradeData);
          console.log('Fetched profile data:', profileData);
          
          // Set the selected user info for showing in the modal
          setSelectedUserId(tradeData.user_id);
          setSelectedUserEmail(profileData?.email || '');
          setSelectedUserFullName(profileData?.full_name || profileData?.email || 'User');
          
          // Format the trade for the form
          const formattedTrade: TradeType = {
            id: tradeData.id,
            userId: tradeData.user_id,
            date: tradeData.date,
            time: tradeData.entry_time,
            pair: tradeData.pair,
            action: tradeData.action as 'Buy' | 'Sell',
            entryTime: tradeData.entry_time,
            exitTime: tradeData.exit_time,
            lots: tradeData.lots,
            pipStopLoss: tradeData.pip_stop_loss,
            pipTakeProfit: tradeData.pip_take_profit,
            profitLoss: tradeData.profit_loss,
            pivots: tradeData.pivots || '',
            bankingLevel: tradeData.banking_level || '',
            riskRatio: tradeData.risk_ratio || 0,
            comments: tradeData.comments,
            day: tradeData.day || '',
            direction: tradeData.direction || '',
            orderType: tradeData.order_type || '',
            marketCondition: tradeData.market_condition || '',
            ma: tradeData.ma || '',
            fib: tradeData.fib || '',
            gap: tradeData.gap || '',
            mindset: tradeData.mindset || '',
            tradeLink: tradeData.trade_link || '',
            trueReward: tradeData.true_reward || '',
            true_tp_sl: tradeData.true_tp_sl || '',
            additional_confluences: tradeData.additional_confluences || ''
          };
          
          setSelectedTrade(formattedTrade);
          setEditMode(false);
          setShowTradeForm(true);
        }
      } catch (err) {
        console.error('Error fetching trade:', err);
        setError('Failed to fetch trade details');
      }
    }
  };

  // Render the user management table if not showing trades
  if (!showTradesModal) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              User Management
            </h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('violations')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'violations'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                All Violations
              </button>
            </div>
          </div>

          {activeTab === 'users' ? (
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
                      <div className="flex items-center">
                        <span>Last Journaled</span>
                        <button 
                          onClick={sortByLastJournaled}
                          className="ml-1 focus:outline-none"
                          aria-label="Sort by last journaled date"
                        >
                          <svg 
                            className="h-4 w-4 text-gray-500 hover:text-gray-700" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            {sortDirection === 'asc' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )}
                          </svg>
                        </button>
                      </div>
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
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleViewTrades(profile.user_id, profile.email, profile.full_name)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Journal
                          </button>
                          <button
                            onClick={() => handleManageRules(profile.user_id, profile.email, profile.full_name)}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Manage Rules
                          </button>
                          <button
                            onClick={() => handleViewViolations(profile.user_id, profile.email, profile.full_name)}
                            className="text-orange-600 hover:text-orange-900 font-medium"
                          >
                            Violations
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
              <h2 className="text-xl font-medium text-gray-900 mb-4">All Trading Rule Violations</h2>
              <TradeViolationsTable 
                onSelectTrade={handleSelectViolationTrade} 
                className="mt-4"
                showAll={true}
              />
            </div>
          )}
        </div>

        {/* User Trading Rules Modal */}
        {showRulesModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <UserTradingRulesForm
                userId={selectedUserId}
                userEmail={selectedUserEmail}
                onClose={() => setShowRulesModal(false)}
                onRulesUpdated={handleRulesUpdated}
              />
            </div>
          </div>
        )}

        {/* User Violations Modal */}
        {showViolationsModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Trading Rule Violations for {selectedUserFullName}
                </h3>
              </div>
              <div className="p-6">
                <TradeViolationsTable 
                  userId={selectedUserId} 
                  onSelectTrade={handleSelectViolationTrade} 
                />
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowViolationsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trade Form Modal - Added here so it works in the violations view */}
        {showTradeForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editMode 
                      ? 'Edit Trade for ' 
                      : 'View Trade Details for '}{selectedUserFullName}
                  </h2>
                  <div className="flex space-x-4">
                    {!editMode && (
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-3 py-1 bg-indigo-100 rounded text-indigo-700 hover:bg-indigo-200 transition-colors"
                      >
                        Edit
                      </button>
                    )}
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
                </div>
                <TradeForm 
                  onClose={handleTradeFormClose}
                  existingTrade={selectedTrade || undefined}
                  readOnly={!editMode}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // Render the trade history in fullscreen mode
  return (
    <>
      <div className="mt-16 flex-grow px-4 pb-4">
        <div className="TradeHistoryTableWrapper h-full">
          <div style={{ minHeight: 'calc(100vh - 80px)' }}>
            <TradeHistoryTable 
              trades={selectedUserTrades} 
              onSelectTrade={handleSelectTrade}
              forcedFullScreen={true}
              targetUserId={selectedUserId}
              onExitFullscreen={handleExitFullscreen}
              journalOwnerName={selectedUserFullName}
              onDeleteTrades={handleDeleteTrades}
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
                  {editMode 
                    ? 'Edit Trade for ' 
                    : 'View Trade Details for '}{selectedUserFullName}
                </h2>
                <div className="flex space-x-4">
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-3 py-1 bg-indigo-100 rounded text-indigo-700 hover:bg-indigo-200 transition-colors"
                    >
                      Edit
                    </button>
                  )}
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
              </div>
              <TradeForm 
                onClose={handleTradeFormClose}
                existingTrade={selectedTrade || undefined}
                readOnly={!editMode}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
