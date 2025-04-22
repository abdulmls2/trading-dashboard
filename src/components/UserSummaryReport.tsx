import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface UserSummaryReportProps {
  userId: string;
  userEmail: string;
  userName: string;
  onClose: () => void;
}

interface SummaryData {
  overall: {
    totalTrades: number;
    totalProfit: number;
    winRate: number;
    totalPips: number;
    averageRR: number;
    profitFactor: number;
    largestWin: number;
    largestLoss: number;
    averageWin: number;
    averageLoss: number;
  };
  monthlyPerformance: any[];
  pairAnalysis: any[];
  sessionAnalysis: {
    morning: any;
    afternoon: any;
    evening: any;
  };
  psychologyMetrics: {
    adherenceRate: number;
    overtrading: number;
    riskManagement: any;
  };
  insights: any[];
}

interface PairAnalysis {
  pair: string;
  trades: number;
  nonBreakevenTrades: number;
  wins: number;
  profit: number;
  pips: number;
  winRate?: number;
}

export default function UserSummaryReport({ userId, userEmail, userName, onClose }: UserSummaryReportProps) {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build the date range query
      let startDate: string, endDate: string;
      const currentYear = new Date().getFullYear();
      
      if (selectedMonth === 'all') {
        if (selectedYear === 'all') {
          // If "All Years" is selected, use the last 5 years
          startDate = `${currentYear - 4}-01-01`;
          endDate = `${currentYear}-12-31`;
        } else {
          startDate = `${selectedYear}-01-01`;
          endDate = `${selectedYear}-12-31`;
        }
      } else {
        const month = selectedMonth as number;
        const year = selectedYear === 'all' ? currentYear : selectedYear as number;
        startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
      }

      // Fetch trades for the period
      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (tradesError) throw tradesError;

      // Calculate overall metrics
      const nonBreakevenTrades = trades.filter(t => t.profit_loss !== 0); // Exclude breakeven trades
      const winningTrades = trades.filter(t => t.profit_loss > 0);
      const losingTrades = trades.filter(t => t.profit_loss < 0);
      
      const totalProfit = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      // Calculate win rate excluding breakeven trades
      const winRate = nonBreakevenTrades.length > 0 
        ? (winningTrades.length / nonBreakevenTrades.length) * 100 
        : 0;
      
      const totalPips = trades.reduce((sum, trade) => {
        if (trade.true_tp_sl && trade.true_tp_sl.trim() !== '') {
          const pipMatch = trade.true_tp_sl.match(/-?\d+(\.\d+)?/);
          return sum + (pipMatch ? parseFloat(pipMatch[0]) : 0);
        }
        return sum;
      }, 0);

      // Calculate performance data (monthly or daily)
      let performanceData;
      if (selectedMonth === 'all') {
        // Monthly performance
        performanceData = Array.from({ length: 12 }, (_, i) => {
          const monthTrades = trades.filter(t => new Date(t.date).getMonth() === i);
          const monthNonBreakevenTrades = monthTrades.filter(t => t.profit_loss !== 0);
          const monthWinningTrades = monthTrades.filter(t => t.profit_loss > 0);
          
          return {
            period: monthNames[i],
            trades: monthTrades.length,
            profit: monthTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
            winRate: monthNonBreakevenTrades.length > 0 
              ? (monthWinningTrades.length / monthNonBreakevenTrades.length) * 100 
              : 0,
            pips: monthTrades.reduce((sum, t) => {
              if (t.true_tp_sl) {
                const pipMatch = t.true_tp_sl.match(/-?\d+(\.\d+)?/);
                return sum + (pipMatch ? parseFloat(pipMatch[0]) : 0);
              }
              return sum;
            }, 0)
          };
        });
      } else {
        // Daily performance for selected month
        const daysInMonth = new Date(
          selectedYear === 'all' ? new Date().getFullYear() : selectedYear as number,
          (selectedMonth as number) + 1,
          0
        ).getDate();

        performanceData = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayStr = `${String(day).padStart(2, '0')}`;
          const dayTrades = trades.filter(t => new Date(t.date).getDate() === day);
          const dayNonBreakevenTrades = dayTrades.filter(t => t.profit_loss !== 0);
          const dayWinningTrades = dayTrades.filter(t => t.profit_loss > 0);

          return {
            period: dayStr,
            trades: dayTrades.length,
            profit: dayTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
            winRate: dayNonBreakevenTrades.length > 0 
              ? (dayWinningTrades.length / dayNonBreakevenTrades.length) * 100 
              : 0,
            pips: dayTrades.reduce((sum, t) => {
              if (t.true_tp_sl) {
                const pipMatch = t.true_tp_sl.match(/-?\d+(\.\d+)?/);
                return sum + (pipMatch ? parseFloat(pipMatch[0]) : 0);
              }
              return sum;
            }, 0)
          };
        });
      }

      // Calculate pair analysis with corrected win rate
      const pairAnalysis = Object.values(
        trades.reduce((acc: Record<string, PairAnalysis>, trade) => {
          const pair = trade.pair || 'Unknown';
          if (!acc[pair]) {
            acc[pair] = {
              pair,
              trades: 0,
              nonBreakevenTrades: 0,
              wins: 0,
              profit: 0,
              pips: 0
            };
          }
          
          acc[pair].trades++;
          if (trade.profit_loss !== 0) {
            acc[pair].nonBreakevenTrades++;
          }
          if (trade.profit_loss > 0) {
            acc[pair].wins++;
          }
          acc[pair].profit += trade.profit_loss || 0;
          
          if (trade.true_tp_sl) {
            const pipMatch = trade.true_tp_sl.match(/-?\d+(\.\d+)?/);
            if (pipMatch) {
              acc[pair].pips += parseFloat(pipMatch[0]);
            }
          }
          
          return acc;
        }, {})
      ).map((pair: PairAnalysis) => ({
        ...pair,
        winRate: pair.nonBreakevenTrades > 0 
          ? (pair.wins / pair.nonBreakevenTrades) * 100 
          : 0
      })).sort((a, b) => b.profit - a.profit);

      // Prepare summary data
      const summary: SummaryData = {
        overall: {
          totalTrades: trades.length,
          totalProfit,
          winRate,
          totalPips,
          averageRR: trades.reduce((sum, t) => sum + (t.risk_ratio || 0), 0) / trades.length,
          profitFactor: Math.abs(
            winningTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) /
            losingTrades.reduce((sum, t) => sum + (t.profit_loss || 0), -1)
          ),
          largestWin: Math.max(...trades.map(t => t.profit_loss || 0)),
          largestLoss: Math.min(...trades.map(t => t.profit_loss || 0)),
          averageWin: winningTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / winningTrades.length,
          averageLoss: losingTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / losingTrades.length,
        },
        monthlyPerformance: performanceData,
        pairAnalysis,
        sessionAnalysis: {
          morning: {},
          afternoon: {},
          evening: {}
        },
        psychologyMetrics: {
          adherenceRate: 0,
          overtrading: 0,
          riskManagement: {}
        },
        insights: []
      };

      // Add analysis insights
      const generateInsights = (data: any) => {
        const insights = [];
        
        // Update period label in insights
        const periodLabel = selectedMonth === 'all'
          ? selectedYear === 'all'
            ? `Last 5 Years (${currentYear - 4} - ${currentYear})`
            : `Year ${selectedYear}`
          : `${monthNames[selectedMonth as number]} ${selectedYear === 'all' ? currentYear : selectedYear}`;

        // Overall performance insight
        insights.push({
          category: 'Overall Performance',
          text: `During ${periodLabel}, ${userName} executed ${data.overall.totalTrades} trades with a win rate of ${data.overall.winRate.toFixed(1)}%, resulting in a total ${data.overall.totalProfit >= 0 ? 'profit' : 'loss'} of ${Math.abs(data.overall.totalProfit).toFixed(2)} and accumulated ${data.overall.totalPips.toFixed(1)} pips.`
        });

        // Profitability insight
        const profitabilityStatus = data.overall.totalProfit >= 0 ? 'profitable' : 'unprofitable';
        const profitabilityInsight = `The trader was ${profitabilityStatus} during this period, with an average win of ${data.overall.averageWin.toFixed(2)} and an average loss of ${Math.abs(data.overall.averageLoss).toFixed(2)}.`;
        insights.push({
          category: 'Profitability',
          text: profitabilityInsight
        });

        // Risk management insight
        const riskRewardInsight = `The average risk-to-reward ratio was ${data.overall.averageRR.toFixed(2)}, with a profit factor of ${data.overall.profitFactor.toFixed(2)}.`;
        insights.push({
          category: 'Risk Management',
          text: riskRewardInsight
        });

        // Best performing pairs
        if (data.pairAnalysis.length > 0) {
          const bestPair = data.pairAnalysis[0];
          const worstPair = data.pairAnalysis[data.pairAnalysis.length - 1];
          insights.push({
            category: 'Currency Pairs',
            text: `The most successful currency pair was ${bestPair.pair} with ${bestPair.trades} trades and a profit of ${bestPair.profit.toFixed(2)}, while ${worstPair.pair} showed the least favorable results with a ${worstPair.profit < 0 ? 'loss' : 'profit'} of ${Math.abs(worstPair.profit).toFixed(2)}.`
          });
        }

        // Monthly performance insight
        const profitableMonths = data.monthlyPerformance.filter((m: any) => m.profit > 0).length;
        insights.push({
          category: 'Monthly Analysis',
          text: `Out of the analyzed period, ${profitableMonths} months were profitable, with the highest monthly profit being ${Math.max(...data.monthlyPerformance.map((m: any) => m.profit)).toFixed(2)}.`
        });

        // Trading consistency
        const avgTradesPerMonth = data.overall.totalTrades / (selectedMonth === 'all' ? 12 : 1);
        insights.push({
          category: 'Trading Consistency',
          text: `On average, ${userName} placed ${avgTradesPerMonth.toFixed(1)} trades per month, demonstrating ${avgTradesPerMonth > 20 ? 'high' : avgTradesPerMonth > 10 ? 'moderate' : 'low'} trading activity.`
        });

        return insights;
      };

      const insights = generateInsights(summary);
      summary.insights = insights;

      setSummaryData(summary);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!summaryData) return;

    try {
      const content = document.getElementById('user-summary-report');
      if (!content) return;

      // Create PDF with A4 dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // margin in mm

      // Get all sections
      const sections = content.querySelectorAll('section');
      
      // Add title to first page
      pdf.setFontSize(18);
      pdf.setTextColor(44, 62, 80);
      const title = `Trading Summary Report - ${userName}`;
      pdf.text(title, pageWidth / 2, 20, { align: 'center' });
      
      // Add period subtitle
      pdf.setFontSize(14);
      const period = selectedMonth === 'all'
        ? selectedYear === 'all'
          ? `Last 5 Years (${new Date().getFullYear() - 4} - ${new Date().getFullYear()})`
          : `Year ${selectedYear}`
        : `${monthNames[selectedMonth as number]} ${selectedYear === 'all' ? new Date().getFullYear() : selectedYear}`;
      pdf.text(period, pageWidth / 2, 30, { align: 'center' });

      let currentY = 40; // Start position after title

      // Process each section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Generate canvas for this section
        const canvas = await html2canvas(section as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        // Calculate dimensions while maintaining aspect ratio
        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page
        if (currentY + imgHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        // Add section to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        
        // Update Y position for next section
        currentY += imgHeight + 10; // Add some spacing between sections
      }

      // Save the PDF
      const fileName = `trading_summary_${userName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Trading Summary Report - {userName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Updated Year Selection */}
          <div className="flex items-center space-x-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Years (Last 5)</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Months</option>
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <div className="flex space-x-2">
              <button
                onClick={generateReport}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate Report
              </button>
              {summaryData && (
                <button
                  onClick={downloadPDF}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          {summaryData && (
            <div id="user-summary-report" className="space-y-8">
              {/* Narrative Analysis Section */}
              <section className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trading Analysis</h3>
                <div className="space-y-6">
                  {summaryData.insights.map((insight: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                      <h4 className="text-sm font-semibold text-indigo-600 mb-2">{insight.category}</h4>
                      <p className="text-gray-700">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Overall Performance */}
              <section className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Trades</p>
                    <p className="text-2xl font-semibold text-gray-900">{summaryData.overall.totalTrades}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Win Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{summaryData.overall.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Profit/Loss</p>
                    <p className={`text-2xl font-semibold ${summaryData.overall.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summaryData.overall.totalProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Pips</p>
                    <p className="text-2xl font-semibold text-indigo-600">{summaryData.overall.totalPips.toFixed(1)}</p>
                  </div>
                </div>
              </section>

              {/* Monthly/Daily Performance Chart */}
              <section className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedMonth === 'all' ? 'Monthly' : 'Daily'} Performance
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData.monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        label={{ 
                          value: selectedMonth === 'all' ? 'Month' : 'Day', 
                          position: 'insideBottom', 
                          offset: -5 
                        }} 
                      />
                      <YAxis yAxisId="left" label={{ value: 'Profit/Loss', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Win Rate %', angle: 90, position: 'insideRight' }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="profit" fill="#4F46E5" name="Profit/Loss" />
                      <Bar yAxisId="right" dataKey="winRate" fill="#10B981" name="Win Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Pair Analysis */}
              <section className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Currency Pair Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trades</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Loss</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pips</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaryData.pairAnalysis.map((pair: any) => (
                        <tr key={pair.pair}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pair.pair}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pair.trades}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {((pair.wins / pair.trades) * 100).toFixed(1)}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pair.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pair.profit.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{pair.pips.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Additional Metrics */}
              <section className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Average R:R</p>
                    <p className="text-2xl font-semibold text-gray-900">{summaryData.overall.averageRR.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Profit Factor</p>
                    <p className="text-2xl font-semibold text-gray-900">{summaryData.overall.profitFactor.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Largest Win</p>
                    <p className="text-2xl font-semibold text-green-600">{summaryData.overall.largestWin.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Largest Loss</p>
                    <p className="text-2xl font-semibold text-red-600">{summaryData.overall.largestLoss.toFixed(2)}</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 