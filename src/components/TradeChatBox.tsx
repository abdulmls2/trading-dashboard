import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Eye, EyeOff } from 'lucide-react';
import { Trade } from '../types';
import { getPromptForKeywords, DEFAULT_PROMPT } from '../lib/promptKeywords';

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
  disableAutoScroll?: boolean;
}

export default function TradeChatBox({ trade, onClose, disableAutoScroll = false }: Props) {
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: 'user' | 'ai';
    promptIds?: string[];
  }>>([
    {
      id: '1',
      text: trade 
        ? `I'm analyzing your ${trade.action} trade on ${trade.pair} from ${trade.date}. This trade resulted in a ${trade.profitLoss >= 0 ? 'profit' : 'loss'} of $${Math.abs(trade.profitLoss)}. What would you like to know about this trade?`
        : 'Hi, I\'m PIP, your trading assistant. What would you like to talk about today?',
      sender: 'ai',
      promptIds: ['DEF_001'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [showPromptIds, setShowPromptIds] = useState(false);
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
    if (!disableAutoScroll) {
      scrollToBottom();
    }
  }, [messages, disableAutoScroll]);

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
      
      Basic Info:
      - Date: ${trade.date}
      - Day: ${trade.day}
      - Pair: ${trade.pair}
      - Action: ${trade.action}
      - Entry time: ${trade.entryTime}
      - Exit time: ${trade.exitTime || 'N/A'}
      
      Technical Details:
      - Direction: ${trade.direction}
      - Lots: ${trade.lots}
      - Stop loss: ${trade.pipStopLoss} pips
      - Take profit: ${trade.pipTakeProfit} pips
      - Risk ratio: ${trade.riskRatio}
      - Order type: ${trade.orderType || 'N/A'}
      - Market condition: ${trade.marketCondition || 'N/A'}
      
      Confluences:
      - Pivots: ${trade.pivots || 'None'}
      - Banking level: ${trade.bankingLevel || 'None'}
      - Moving average: ${trade.ma || 'None'}
      - Fibonacci: ${trade.fib || 'None'}
      - Gap: ${trade.gap || 'None'}
      - Additional Confluences: ${trade.additional_confluences || 'None'}
      
      Result:
      - Profit/Loss: ${trade.profitLoss}
      - True Reward: ${trade.trueReward || 'N/A'}
      - True TP/SL: ${trade.true_tp_sl || 'N/A'}
      
      Notes & Links:
      - Mindset: ${trade.mindset || 'Unknown'}
      - Trade Link: ${trade.tradeLink || 'None'}
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

    // Check for keywords in the user message
    const keywordPrompts = getPromptForKeywords(userMessage);
    
    // Log when keywords are detected (for debugging)
    if (keywordPrompts.length > 0) {
      console.log(`Detected ${keywordPrompts.length} keyword matches in message: "${userMessage}"`);
    } else {
      console.log(`No keyword matches found, using DEFAULT_PROMPT`);
    }
    
    // Create the system prompt, adding keyword information if found
    let systemPrompt = `
    Your name is Pip. You are a friendly trading assistant for Come Learn Forex. Engage in friendly, helpful conversations with traders (avoid using usernames). Occasionally, mention the company, Come Learn Forex (CLF).

    Guidelines for Responses:
    -Stick to CLF's teachings: Only explain concepts exactly as they are provided in the information below. Do not introduce new terms, redefine concepts differently, or offer outside explanations.
    -Keep responses concise and clear: Provide simple, direct answers without overwhelming detail.
    -Use examples: Where applicable, give straightforward examples to help traders understand.
    -Use appropriate emojis to structure your answers, but don't use emojis randomly; make sure to use them in a natural way.
    -Encourage understanding: If a trader seems unsure, clarify with an example or a different phrasing (but without changing the core explanation).
    -Do not give signals, If a trader asks about signals, respond in a frustrated way and be really angry and use emojis while mentioning that you will smoke them and mention that it is Ramadan so you don't want to swear. To give signals, we have to be FCA regulated, if not, we can get massive fines.
    
    You can also analyze trades and provide feedback on the trades, by applying the concepts and teachings of Come Learn Forex.
     
    Here's information about the trade to analyze:
    ${tradeContext}
    
    Important Note on Confluences: 
    - Any item listed under the 'Confluences' heading above should be considered a confluence factor if it has ANY value, including 'True', 'False', numbers, or text.
    - Only items with 'None' or 'N/A' should be excluded from the confluence count.
    - The Banking Level field is a confluence regardless of whether it's 'True' or 'False' - it indicates whether a banking level was considered in the trade.
    - Additional Confluences can contain any text value and should be counted as a confluence if present.`;
    
    // Append keyword-specific information if found
    if (keywordPrompts.length > 0) {
      systemPrompt += `\n\nThe user mentioned specific trading concepts. Please include the following information in your response:`;
      
      keywordPrompts.forEach(prompt => {
        systemPrompt += `\n\n${prompt}`;
      });
    } else {
      // If no keywords were found, add the DEFAULT_PROMPT
      systemPrompt += `\n\nThe user has not mentioned a specific trading concept. Please include the following general information in your response:\n\n${DEFAULT_PROMPT}`;
    }

    // Prepare the payload
    const payload = {
      "model": "openai/gpt-4o-mini",
      "messages": [
        {
          "role": "system",
          "content": systemPrompt
        },
        {
          "role": "user",
          "content": userMessage
        }
      ]
    };
    
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
        body: JSON.stringify(payload)
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

  const extractPromptIds = (promptString: string): string[] => {
    const regex = /\[PROMPT_ID: ([^\]]+)\]/g;
    const promptIds: string[] = [];
    let match;
    
    while ((match = regex.exec(promptString)) !== null) {
      promptIds.push(match[1]);
    }
    
    return promptIds;
  };

  const extractPromptIdsFromPrompts = (prompts: string[]): string[] => {
    const allIds: string[] = [];
    
    prompts.forEach(prompt => {
      allIds.push(...extractPromptIds(prompt));
    });
    
    return allIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: input, sender: 'user' },
    ]);
    
    // Clear input and show loading state
    setInput('');
    setIsLoading(true);
    
    try {
      // Set context based on whether a trade is selected
      const context = trade 
        ? generateTradeContext(trade) 
        : "No specific trade is being analyzed. The user is asking a general question about trading.";
      
      // Get keyword prompts and extract IDs
      const keywordPrompts = getPromptForKeywords(input);
      const promptIds = keywordPrompts.length > 0 
        ? extractPromptIdsFromPrompts(keywordPrompts) 
        : extractPromptIds(DEFAULT_PROMPT);
      
      // Get AI response
      const aiResponse = await fetchAIResponse(input, context);
      
      // Add AI response to messages with prompt IDs
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: aiResponse,
          sender: 'ai',
          promptIds: promptIds
        },
      ]);
    } catch (error) {
      console.error('Error in chat process:', error);
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "I'm sorry, I couldn't process your request properly. Please try again.",
          sender: 'ai',
          promptIds: []
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePromptIds = () => {
    setShowPromptIds(prev => !prev);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <h3 className="text-lg font-medium">{trade ? "Trade Analysis Chat" : "Chat with PIP"}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePromptIds}
            title={showPromptIds ? "Hide Prompt IDs" : "Show Prompt IDs"}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
          >
            {showPromptIds ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
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
              <p className="text-sm whitespace-pre-line">
                {message.text}
                {showPromptIds && message.sender === 'ai' && message.promptIds && message.promptIds.length > 0 && (
                  <span className="mt-2 block text-xs text-indigo-600 border-t border-gray-200 pt-1">
                    Prompt IDs: {message.promptIds.join(', ')}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <p className="text-sm text-gray-600">{trade ? "Analyzing trade..." : "Thinking..."}</p>
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
            placeholder={trade ? "Ask about this trade..." : "Ask me anything about trading..."}
            disabled={isLoading || !!configError}
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !!configError}
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