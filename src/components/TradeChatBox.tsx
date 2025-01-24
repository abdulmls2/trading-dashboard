import React from 'react';
import { Send } from 'lucide-react';
import { Trade } from '../types';

interface Props {
  trade: Trade | null;
  onClose: () => void;
}

export default function TradeChatBox({ trade, onClose }: Props) {
  const [messages, setMessages] = React.useState<Array<{
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
  const [input, setInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    // Removed scrollToBottom call
    // scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (trade) {
      setMessages([
        {
          id: Date.now().toString(),
          text: `I'm analyzing your ${trade.action} trade on ${trade.pair} from ${trade.date}. This trade resulted in a ${trade.profitLoss >= 0 ? 'profit' : 'loss'} of $${Math.abs(trade.profitLoss)}. What would you like to know about this trade?`,
          sender: 'ai',
        },
      ]);
    }
  }, [trade]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !trade) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: input, sender: 'user' },
    ]);
    setInput('');

    // Simulate AI response based on trade context
    setTimeout(() => {
      let aiResponse = '';
      if (input.toLowerCase().includes('risk')) {
        aiResponse = `For this trade, you used a risk ratio of ${trade.riskRatio}. Your stop loss was set at ${trade.pipStopLoss} pips and take profit at ${trade.pipTakeProfit} pips.`;
      } else if (input.toLowerCase().includes('analysis')) {
        aiResponse = `This ${trade.action} trade on ${trade.pair} was taken at ${trade.entryTime} with ${trade.lots} lots. The trade was based on ${trade.pivots} and ${trade.bankingLevel} levels.`;
      } else {
        aiResponse = `I can help analyze various aspects of this trade, such as risk management, entry/exit timing, or technical levels used. What specific aspect would you like to explore?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'ai',
        },
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
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
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={trade ? "Ask about this trade..." : "Select a trade to start analysis"}
            disabled={!trade}
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!trade}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}