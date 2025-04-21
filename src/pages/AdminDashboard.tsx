import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserImpersonation } from '../contexts/UserImpersonationContext';
import { supabase } from '../lib/supabase';
import TradeHistoryTable from '../components/TradeHistoryTable';
import { Trade as TradeType } from '../types';
import TradeForm from '../components/TradeForm';
import UserTradingRulesForm from '../components/UserTradingRulesForm';
import TradeViolationsTable from '../components/TradeViolationsTable';
import { BarChart2, User, Calendar, BookOpen, Activity, Settings, AlertTriangle } from 'lucide-react';

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
  const { user, isAdmin } = useAuth();
  const { 
    startImpersonation, 
    stopImpersonation, 
    isImpersonating, 
    redirectToUserSection 
  } = useUserImpersonation();
  const params = useParams<{ userId?: string }>();
  const location = useLocation();
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

  // Effect to check for userId parameter and setup performance view when component mounts
  useEffect(() => {
    // If we're on the user performance route with a userId parameter
    if (params.userId) {
      // Find the user in profiles
      const userProfile = profiles.find(profile => profile.user_id === params.userId);
      
      if (userProfile) {
        handleImpersonateUser(userProfile);
      }
    }
  }, [params.userId, profiles]);

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

  // Function to start impersonating a user
  const handleImpersonateUser = (profile: UserProfile) => {
    startImpersonation(profile);
  };

  // Redirect to user's section (journal, performance, etc.)
  const handleViewUserSection = (section: string, profile: UserProfile) => {
    console.log("Admin viewing section:", section, "for user:", profile.user_id, profile.email);
    
    // Ensure we have all the user data needed
    if (!profile.user_id) {
      console.error("Cannot impersonate user - missing user_id", profile);
      return;
    }
    
    // Start impersonating the user
    startImpersonation(profile);
    
    // Add a small delay to ensure impersonation state is updated
    setTimeout(() => {
      console.log("Redirecting to", section, "for impersonated user:", profile.user_id);
      // Redirect to /performance instead of /admin
      navigate(`/performance`);
    }, 100);
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
          .select('*')
            .eq('user_id', tradeData.user_id)
            .single();
            
          console.log('Fetched trade data:', tradeData);
          console.log('Fetched profile data:', profileData);
          
        // Start impersonating this user and redirect to journal
        if (profileData) {
          startImpersonation(profileData);
          
          // We need a small delay to ensure impersonation is set up
          setTimeout(() => {
            redirectToUserSection('journal');
          }, 100);
        }
        }
      } catch (err) {
        console.error('Error fetching trade:', err);
        setError('Failed to fetch trade details');
    }
  };

  // Render the user management table if not impersonating
  if (!isImpersonating) {
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
            <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
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
                            onClick={() => handleViewUserSection('journal', profile)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                            title="View Journal"
                          >
                            <BookOpen className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleManageRules(profile.user_id, profile.email, profile.full_name)}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                            title="Manage Rules"
                          >
                            <Settings className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleViewViolations(profile.user_id, profile.email, profile.full_name)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded-full hover:bg-orange-50"
                            title="View Violations"
                          >
                            <AlertTriangle className="h-5 w-5" />
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
      </main>
    );
  }

  // If impersonating, show a banner and navigation options for admin
  return (
    <div className="relative">
      {/* Admin banner for impersonation mode */}
      <div className="fixed top-0 left-0 right-0 bg-indigo-600 text-white z-50 p-2 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <span className="font-semibold">Admin Mode:</span> Viewing dashboard as {selectedUserFullName || "User"}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => stopImpersonation()}
              className="px-3 py-1 bg-white text-indigo-600 rounded hover:bg-indigo-100 font-medium text-sm"
            >
              Exit User View
            </button>
          </div>
        </div>
      </div>

      {/* Add extra padding to account for the admin banner */}
      <div className="pt-12"></div>
        </div>
  );
}
