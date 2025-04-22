import { useEffect, useState, useRef } from 'react';
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  last_trade_date?: string;
  discord_username?: string | null;
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
  pips_gained?: number;
  pip_value?: number;
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
  const [activeTab, setActiveTab] = useState<'users' | 'violations' | 'summary'>('users');
  const [editMode, setEditMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth()); // 0-11
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  // Available years for selection (current year and 5 years back)
  const availableYears = Array.from(
    { length: 6 }, 
    (_, i) => new Date().getFullYear() - i
  );
  
  // Month names for display
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Helper function to determine the best display name for a user
  const getUserDisplayName = (user: any) => {
    // Try full name first
    if (user.fullName && user.fullName.trim() !== '' && user.fullName !== 'Unknown') {
      return user.fullName;
    }
    
    // Then try username
    if (user.username && user.username.trim() !== '') {
      return user.username;
    }
    
    // Then try discord username with indicator
    if (user.discordUsername && user.discordUsername.trim() !== '') {
      return `${user.discordUsername} (Discord)`;
    }
    
    // Finally fall back to email
    if (user.email && user.email.trim() !== '') {
      return user.email;
    }
    
    // Absolute last resort
    return `User ${user.userId.slice(0, 6)}...`;
  };

  // Function to fetch summary report data
  const fetchSummaryData = async () => {
    setLoadingSummary(true);
    
    try {
      let query = supabase.from('trades').select('*');
      
      // Calculate date range based on selections
      let startDate: string, endDate: string;
      let periodLabel: string;
      
      if (selectedYear === 'all' && selectedMonth === 'all') {
        // All time - use very old start date and future end date
        const oldestDate = new Date(2000, 0, 1); // January 1, 2000
        const futureDate = new Date(2100, 11, 31); // December 31, 2100
        
        startDate = oldestDate.toISOString().split('T')[0];
        endDate = futureDate.toISOString().split('T')[0];
        
        periodLabel = "All Time";
        console.log("Generating report for all time with date range:", startDate, "to", endDate);
      } 
      else if (selectedYear === 'all') {
        // All years for specific month
        const currentYear = new Date().getFullYear();
        // Go back 5 years as a reasonable limit
        const oldestYear = currentYear - 5;
        
        // Use month from all years
        startDate = new Date(oldestYear, selectedMonth as number, 1).toISOString().split('T')[0];
        // Current year's month as end date
        endDate = new Date(currentYear, (selectedMonth as number) + 1, 0).toISOString().split('T')[0];
        
        query = query.gte('date', startDate).lte('date', endDate);
        periodLabel = `${monthNames[selectedMonth as number]} (All Years)`;
        console.log("Generating report for month across years:", startDate, "to", endDate);
      } 
      else if (selectedMonth === 'all') {
        // All months for specific year
        startDate = new Date(selectedYear as number, 0, 1).toISOString().split('T')[0];
        endDate = new Date(selectedYear as number, 11, 31).toISOString().split('T')[0];
        
        query = query.gte('date', startDate).lte('date', endDate);
        periodLabel = `${selectedYear} (All Months)`;
        console.log("Generating report for all months in year:", startDate, "to", endDate);
      } 
      else {
        // Specific year and month
        startDate = new Date(selectedYear as number, selectedMonth as number, 1).toISOString().split('T')[0];
        endDate = new Date(selectedYear as number, (selectedMonth as number) + 1, 0).toISOString().split('T')[0];
        
        query = query.gte('date', startDate).lte('date', endDate);
        periodLabel = `${monthNames[selectedMonth as number]} ${selectedYear}`;
        console.log("Generating report for specific month/year:", startDate, "to", endDate);
      }
      
      // Execute the query with proper date filters
      const { data: trades, error: tradesError } = await query.order('date', { ascending: false });
      
      if (tradesError) throw tradesError;
      
      // Get all users for mapping - fetch more complete profile data
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) throw profilesError;
      
      console.log("Fetched profiles:", allProfiles); // Debug log to see profile data
      
      // Get all rule violations for the period
      let violationsQuery = supabase.from('trade_violations').select('*');
      
      // Only add date filters if we have valid dates
      if (startDate) {
        violationsQuery = violationsQuery.gte('created_at', new Date(startDate).toISOString());
      }
      
      if (endDate) {
        // Add time component to make it end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        violationsQuery = violationsQuery.lte('created_at', endDateTime.toISOString());
      }
      
      const { data: violations, error: violationsError } = await violationsQuery;
      
      if (violationsError) throw violationsError;
      
      // Calculate overall metrics
      const totalTrades = trades.length;
      const totalProfit = trades.reduce((sum: number, trade: DbTrade) => sum + (trade.profit_loss || 0), 0);
      
      // Correct calculation for total pips using true_tp_sl field
      const totalPips = trades.reduce((sum: number, trade: DbTrade) => {
        // Use the true_tp_sl field as the source of pip data
        if (trade.true_tp_sl && trade.true_tp_sl.trim() !== '') {
          try {
            // Parse the numeric value from the true_tp_sl field
            // It might be formatted like "+45 pips" or "-12 pips" so we need to extract the number
            const pipMatch = trade.true_tp_sl.match(/-?\d+(\.\d+)?/);
            if (pipMatch && pipMatch[0]) {
              return sum + parseFloat(pipMatch[0]);
            }
          } catch (e) {
            console.error("Error parsing true_tp_sl value:", trade.true_tp_sl);
          }
        }
        
        return sum;
      }, 0);
      
      // Update win rate calculation to exclude breakeven trades
      const profitableTrades = trades.filter((trade: DbTrade) => (trade.profit_loss || 0) > 0);
      const breakevenTrades = trades.filter((trade: DbTrade) => (trade.profit_loss || 0) === 0);
      const lossTrades = trades.filter((trade: DbTrade) => (trade.profit_loss || 0) < 0);
      
      // Calculate win rate excluding breakeven trades
      const tradesExcludingBreakeven = totalTrades - breakevenTrades.length;
      const winRate = tradesExcludingBreakeven > 0 
        ? (profitableTrades.length / tradesExcludingBreakeven) * 100 
        : 0;
      
      // Group trades by user
      const userTradeMap = trades.reduce((acc: Record<string, DbTrade[]>, trade: DbTrade) => {
        const userId = trade.user_id || '';
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(trade);
        return acc;
      }, {});
      
      // Calculate per-user metrics
      const userMetrics = Object.keys(userTradeMap).map(userId => {
        const userTrades = userTradeMap[userId];
        const userProfile = allProfiles.find(p => p.user_id === userId);
        const userViolations = violations.filter(v => v.user_id === userId);
        
        // Debug log for each user
        console.log(`User ${userId} profile:`, userProfile);
        
        // Calculate user's total pips using true_tp_sl
        const userTotalPips = userTrades.reduce((sum: number, trade: DbTrade) => {
          // Use the true_tp_sl field as the source of pip data
          if (trade.true_tp_sl && trade.true_tp_sl.trim() !== '') {
            try {
              // Parse the numeric value from the true_tp_sl field
              const pipMatch = trade.true_tp_sl.match(/-?\d+(\.\d+)?/);
              if (pipMatch && pipMatch[0]) {
                return sum + parseFloat(pipMatch[0]);
              }
            } catch (e) {
              console.error("Error parsing user trade true_tp_sl value:", trade.true_tp_sl);
            }
          }
          
          return sum;
        }, 0);
        
        // Calculate win rate excluding breakeven trades
        const userProfitableTrades = userTrades.filter((t: DbTrade) => (t.profit_loss || 0) > 0);
        const userBreakevenTrades = userTrades.filter((t: DbTrade) => (t.profit_loss || 0) === 0);
        const tradesExcludingBreakeven = userTrades.length - userBreakevenTrades.length;
        
        const userWinRate = tradesExcludingBreakeven > 0 
          ? (userProfitableTrades.length / tradesExcludingBreakeven) * 100 
          : 0;
        
        return {
          userId,
          email: userProfile?.email || '',
          fullName: userProfile?.full_name || '',
          username: userProfile?.username || '',
          discordUsername: userProfile?.discord_username || '',
          tradeCount: userTrades.length,
          profit: userTrades.reduce((sum: number, trade: DbTrade) => sum + (trade.profit_loss || 0), 0),
          winRate: userWinRate,
          totalPips: userTotalPips,
          violationCount: userViolations.length
        };
      }).sort((a, b) => b.profit - a.profit);
      
      // Calculate trading pairs statistics
      const pairStats = trades.reduce((acc: Record<string, any>, trade: DbTrade) => {
        const pair = trade.pair || 'Unknown';
        if (!acc[pair]) {
          acc[pair] = {
            pair,
            count: 0,
            profit: 0,
            wins: 0,
            pips: 0
          };
        }
        
        // Calculate pips for this pair using true_tp_sl
        let pipsForTrade = 0;
        if (trade.true_tp_sl && trade.true_tp_sl.trim() !== '') {
          try {
            // Parse the numeric value from the true_tp_sl field
            const pipMatch = trade.true_tp_sl.match(/-?\d+(\.\d+)?/);
            if (pipMatch && pipMatch[0]) {
              pipsForTrade = parseFloat(pipMatch[0]);
            }
          } catch (e) {
            console.error("Error parsing pair trade true_tp_sl value:", trade.true_tp_sl);
          }
        }
        
        acc[pair].count++;
        acc[pair].profit += (trade.profit_loss || 0);
        acc[pair].pips += pipsForTrade;
        if ((trade.profit_loss || 0) > 0) {
          acc[pair].wins++;
        }
        
        return acc;
      }, {});
      
      // Calculate correct win rates for pairs (excluding breakeven trades)
      Object.values(pairStats).forEach((pairStat: any) => {
        const breakevenCount = trades
          .filter(t => t.pair === pairStat.pair && (t.profit_loss || 0) === 0)
          .length;
        
        const tradesExcludingBreakeven = pairStat.count - breakevenCount;
        
        pairStat.winRate = tradesExcludingBreakeven > 0 
          ? (pairStat.wins / tradesExcludingBreakeven) * 100 
          : 0;
      });
      
      const topPairs = Object.values(pairStats)
        .sort((a: any, b: any) => b.profit - a.profit)
        .slice(0, 5);
      
      // Compile summary data
      setSummaryData({
        period: {
          monthYear: periodLabel
        },
        overall: {
          totalTrades,
          totalProfit,
          totalPips,
          winRate,
          totalViolations: violations.length
        },
        userMetrics,
        topPairs
      });
      
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setError('Failed to generate summary report');
    } finally {
      setLoadingSummary(false);
    }
  };

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

  // Improve the PDF generation function
  const downloadReportAsPDF = async () => {
    if (!reportContentRef.current || !summaryData) return;
    
    try {
      setError(null);
      const content = reportContentRef.current;
      
      // Get all sections to generate them separately
      const sections = content.querySelectorAll('.report-section');
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // margin in mm
      
      // Add report title
      pdf.setFontSize(18);
      pdf.setTextColor(44, 62, 80); // Dark blue
      pdf.text(`Trading Summary Report`, pageWidth/2, 15, { align: 'center' });
      
      // Add period subtitle
      pdf.setFontSize(14);
      pdf.text(`${summaryData.period.monthYear}`, pageWidth/2, 22, { align: 'center' });
      
      // Add date of generation
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100); // Gray
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth/2, 30, { align: 'center' });
      
      // Process each section
      let yPosition = 40;
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Generate canvas for this section
        const canvas = await html2canvas(section as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        
        // Calculate dimensions while maintaining aspect ratio
        const availableWidth = pageWidth - 2 * margin;
        const imgWidth = availableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if this section needs a new page
        if (yPosition + imgHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Add section to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        
        // Update position for next section
        yPosition += imgHeight + 10; // Add some space between sections
      }
      
      // Download PDF
      pdf.save(`trading_report_${summaryData.period.monthYear.replace(/\s+/g, '_')}.pdf`);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
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
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'summary'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                Summary Report
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
          ) : activeTab === 'violations' ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
              <h2 className="text-xl font-medium text-gray-900 mb-4">All Trading Rule Violations</h2>
              <TradeViolationsTable 
                onSelectTrade={handleSelectViolationTrade} 
                className="mt-4"
                showAll={true}
              />
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
              <h2 className="text-xl font-medium text-gray-900 mb-4">Summary Report</h2>
              
              {/* Year and Month selectors */}
              <div className="flex items-center space-x-4 mb-6">
                <div>
                  <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">
                    Year
                  </label>
                  <select
                    id="year-select"
                    className="mt-1 block w-32 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={selectedYear}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedYear(value === 'all' ? 'all' : parseInt(value));
                    }}
                  >
                    <option value="all">All Years</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">
                    Month
                  </label>
                  <select
                    id="month-select"
                    className="mt-1 block w-40 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={selectedMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedMonth(value === 'all' ? 'all' : parseInt(value));
                    }}
                  >
                    <option value="all">All Months</option>
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1"></div>
                <div className="flex space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={fetchSummaryData}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Generate Report
                  </button>
                  {summaryData && (
                    <button
                      type="button"
                      onClick={downloadReportAsPDF}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Download PDF
                    </button>
                  )}
                </div>
              </div>
              
              {loadingSummary ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                </div>
              ) : summaryData ? (
                <div ref={reportContentRef} className="space-y-12">
                  {/* Overall Statistics */}
                  <div className="report-section">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Trading Statistics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-base font-bold text-gray-800 mb-2">Total Trades</dt>
                          <dd className="mt-1 text-3xl font-semibold text-gray-900">{summaryData.overall.totalTrades}</dd>
                        </div>
                      </div>
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-base font-bold text-gray-800 mb-2">Total Profit/Loss</dt>
                          <dd className={`mt-1 text-3xl font-semibold ${summaryData.overall.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summaryData.overall.totalProfit.toFixed(2)}
                          </dd>
                        </div>
                      </div>
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-base font-bold text-gray-800 mb-2">Win Rate</dt>
                          <dd className="mt-1 text-3xl font-semibold text-gray-900">{summaryData.overall.winRate.toFixed(1)}%</dd>
                        </div>
                      </div>
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-base font-bold text-gray-800 mb-2">Total Pips</dt>
                          <dd className="mt-1 text-3xl font-semibold text-indigo-600">
                            {summaryData.overall.totalPips.toFixed(1)}
                          </dd>
                        </div>
                      </div>
                      <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                          <dt className="text-base font-bold text-gray-800 mb-2">Rule Violations</dt>
                          <dd className="mt-1 text-3xl font-semibold text-orange-500">{summaryData.overall.totalViolations}</dd>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Top Trading Pairs */}
                  <div className="report-section">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Trading Pairs</h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trades</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Profit/Loss</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summaryData.topPairs.map((pair: any) => (
                            <tr key={pair.pair}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pair.pair}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pair.count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {pair.winRate.toFixed(1)}%
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pair.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pair.profit.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          {summaryData.topPairs.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No trading pair data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* User Performance Rankings */}
                  <div className="report-section">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">User Performance Rankings</h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trader</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trades</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total P/L</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pips</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violations</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summaryData.userMetrics.map((user: any) => (
                            <tr key={user.userId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {getUserDisplayName(user)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.tradeCount}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.winRate.toFixed(1)}%</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${user.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {user.profit.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                {user.totalPips.toFixed(1)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.violationCount}</td>
                            </tr>
                          ))}
                          {summaryData.userMetrics.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No user data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Select a date range and click "Generate Report" to view summary data
                </div>
              )}
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
