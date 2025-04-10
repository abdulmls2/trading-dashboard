import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Trade } from '../types';

// Add environment variable type definition
declare global {
  interface ImportMetaEnv {
    VITE_OPENROUTER_API_KEY: string;
    VITE_SITE_URL: string;
    VITE_SITE_NAME: string;
  }
}

interface Props {
  trade: Trade | null;
  onClose: () => void;
}

export default function TradeChatBox({ trade, onClose }: Props) {
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: 'user' | 'ai';
  }>>([
    {
      id: '1',
      text: trade 
        ? `I'm analyzing your ${trade.action} trade on ${trade.pair} from ${trade.date}. This trade resulted in a ${trade.profitLoss >= 0 ? 'profit' : 'loss'} of $${Math.abs(trade.profitLoss)}. What would you like to know about this trade?`
        : 'Select a trade from the table to analyze it.',
      sender: 'ai',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if configuration is correct
  useEffect(() => {
    const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!openrouterApiKey) {
      setConfigError("OpenRouter API key is missing. Please add it to your environment variables.");
    } else if (openrouterApiKey === 'your_openrouter_api_key_here') {
      setConfigError("OpenRouter API key is not configured. Please replace the placeholder with your actual API key.");
    } else {
      setConfigError(null);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (trade) {
      // Different initial message for analytics vs individual trades
      const initialMessage = trade.id === 'analysis' 
        ? `I'm analyzing your trading performance for ${trade.date}. You had ${trade.comments?.split('Analysis of ')[1]?.split(' trades')[0] || 'several'} trades with a total ${trade.profitLoss >= 0 ? 'profit' : 'loss'} of $${Math.abs(trade.profitLoss).toFixed(2)}. What would you like to know about your trading performance?`
        : `I'm analyzing your ${trade.action} trade on ${trade.pair} from ${trade.date}. This trade resulted in a ${trade.profitLoss >= 0 ? 'profit' : 'loss'} of $${Math.abs(trade.profitLoss).toFixed(2)}. What would you like to know about this trade?`;
      
      setMessages([
        {
          id: Date.now().toString(),
          text: initialMessage,
          sender: 'ai',
        },
      ]);
    }
  }, [trade]);

  const generateTradeContext = (trade: Trade) => {
    // Check if this is an analytics context
    if (trade.id === 'analysis') {
      // Parse additional analytics data if available
      let analyticsData = {};
      try {
        if (trade.additional_confluences) {
          analyticsData = JSON.parse(trade.additional_confluences);
        }
      } catch (error) {
        console.error('Error parsing analytics data', error);
      }
      
      // Extract data from parsed JSON
      const { 
        winRate, 
        marketConditions = {}, 
        dayProfits = {},
        totalTrades = 0,
        winningTrades = 0,
        losingTrades = 0
      } = analyticsData as any;
      
      // Format market conditions for readability
      const formattedMarketConditions = Object.entries(marketConditions)
        .map(([condition, count]) => `${condition}: ${count} trades`)
        .join(', ');
        
      // Format day profits for readability
      const formattedDayProfits = Object.entries(dayProfits)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([day, profit]) => `${day}: ${(profit as number).toFixed(2)}`)
        .join(', ');
      
      // For analytics data, provide a detailed analytics context
      return `
        Trade Analytics:
        - Period: ${trade.date}
        - Total trades: ${totalTrades} 
        - Winning trades: ${winningTrades}
        - Losing trades: ${losingTrades}
        - Win rate: ${winRate}%
        - Total profit/loss: ${trade.profitLoss.toFixed(2)}
        - Most common market conditions: ${formattedMarketConditions || 'No data'}
        - Profit by day: ${formattedDayProfits || 'No data'}
        - Most profitable day: ${trade.day || 'Unknown'}
        - Most common market condition: ${trade.marketCondition || 'Unknown'}
        
        This is an analytics overview that summarizes trading performance over a period.
        The user wants to analyze their trading performance, not a specific trade.
        
        Provide insights on:
        - The overall performance (profitable or not)
        - Any patterns in the most profitable days or market conditions
        - Suggestions for improvement based on win rate and profitability
        - Questions to ask the user to get more specific information
        - Trading psychology tips based on the performance
      `;
    }
    
    // Regular trade context for individual trades
    return `
      Trade details:
      - Pair: ${trade.pair}
      - Date: ${trade.date}
      - Action: ${trade.action}
      - Entry time: ${trade.entryTime}
      - Exit time: ${trade.exitTime}
      - Lots: ${trade.lots}
      - Stop loss: ${trade.pipStopLoss} pips
      - Take profit: ${trade.pipTakeProfit} pips
      - Profit/Loss: ${trade.profitLoss}
      - Risk ratio: ${trade.riskRatio}
      - Day: ${trade.day}
      - Direction: ${trade.direction}
      - Order type: ${trade.orderType}
      - Market condition: ${trade.marketCondition}
      - Moving average: ${trade.ma || 'None'}
      - Fibonacci: ${trade.fib || 'None'}
      - Pivots: ${trade.pivots || 'None'}
      - Banking level: ${trade.bankingLevel || 'None'}
      - Gap: ${trade.gap || 'None'}
      - Mindset: ${trade.mindset || 'Unknown'}
      - Comments: ${trade.comments || 'None'}
    `;
  };

  const fetchAIResponse = async (userMessage: string, tradeContext: string) => {
    const openrouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const siteName = import.meta.env.VITE_SITE_NAME || 'Trading Dashboard';
    
    if (!openrouterApiKey) {
      console.error('OpenRouter API key is missing');
      return "I couldn't connect to the AI service due to a configuration issue. Please contact the administrator to set up the API key.";
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        mode: "cors",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "HTTP-Referer": siteUrl,
          "X-Title": siteName,
          "Content-Type": "application/json",
          "Origin": window.location.origin
        },
        body: JSON.stringify({
          "model": "openai/gpt-4o-mini",
          "messages": [
            {
              "role": "system",
              "content": `You are a trading coach and analyst specializing in forex, stocks, and crypto trading.
              Your job is to help analyze trades, identify strengths and weaknesses, and provide 
              educational insights to help the trader improve. Be specific and helpful. 
              
              Here's information about the trade to analyze:
              ${tradeContext}`
            },
            {
              "role": "user",
              "content": userMessage
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching AI response:', error);
      
      // More helpful error message
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          return "The AI service is currently experiencing high demand. Please try again in a moment.";
        } else if (error.message.includes('403')) {
          return "There seems to be an authentication issue with the AI service. Please contact the administrator.";
        } else if (error.message.includes('5')) {  // 500-level errors
          return "The AI service is currently experiencing technical difficulties. Please try again later.";
        }
      }
      
      return "I'm sorry, I couldn't analyze your trade right now. Please try again later.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !trade) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: input, sender: 'user' },
    ]);
    
    // Clear input and show loading state
    setInput('');
    setIsLoading(true);
    
    try {
      // Generate trade context for AI
      const tradeContext = generateTradeContext(trade);
      
      // Get AI response
      const aiResponse = await fetchAIResponse(input, tradeContext);
      
      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: aiResponse,
          sender: 'ai',
        },
      ]);
    } catch (error) {
      console.error('Error in chat process:', error);
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "I'm sorry, I couldn't analyze your trade properly. Please try again.",
          sender: 'ai',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <h3 className="text-lg font-medium">Trade Analysis Chat</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Display configuration error if any */}
      {configError && (
        <div className="p-4 m-4 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Configuration Error</h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>{configError}</p>
                <p className="mt-1">This is required for the AI chat functionality to work properly.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <p className="text-sm text-gray-600">Analyzing trade...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={trade ? "Ask about this trade..." : "Select a trade to start analysis"}
            disabled={!trade || isLoading || !!configError}
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!trade || isLoading || !input.trim() || !!configError}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}

interface X {
  className: string;
}

// Simple X icon component if not available from lucide-react
function X({ className }: X) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M6 18L18 6M6 6l12 12" 
      />
    </svg>
  );
}