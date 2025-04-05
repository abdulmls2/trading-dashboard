import React, { useState, useEffect } from 'react';
import { UserTradingRule } from '../types';
import { 
  getUserTradingRules, 
  createTradingRule, 
  updateTradingRule, 
  deleteTradingRule 
} from '../lib/api';

const ruleTypeOptions = [
  { value: 'pair', label: 'Currency Pairs' },
  { value: 'day', label: 'Trading Days' },
  { value: 'direction', label: 'Direction' },
  { value: 'lot', label: 'Lot Size Range' }
];

interface Props {
  userId: string;
  userEmail: string;
  onClose: () => void;
  onRulesUpdated?: () => void;
}

export default function UserTradingRulesForm({ userId, userEmail, onClose, onRulesUpdated }: Props) {
  const [rules, setRules] = useState<UserTradingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // States for new rule form
  const [newRuleType, setNewRuleType] = useState<'pair' | 'day' | 'lot' | 'direction'>('pair');
  const [newAllowedValues, setNewAllowedValues] = useState<string[]>([]);
  const [newValueInput, setNewValueInput] = useState('');
  
  // Presets for common values
  const presets = {
    pair: ['GBP/USD', 'EUR/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    direction: ['Bullish', 'Bearish'],
    lot: ['0.01-0.1', '0.1-0.5', '0.5-1.0', '1.0-5.0']
  };

  // Load existing rules
  useEffect(() => {
    async function loadRules() {
      try {
        setLoading(true);
        const data = await getUserTradingRules(userId);
        setRules(data);
      } catch (err) {
        console.error('Error loading rules:', err);
        setError('Failed to load trading rules');
      } finally {
        setLoading(false);
      }
    }

    loadRules();
  }, [userId]);

  // Handler for adding a value to the new allowed values list
  const handleAddAllowedValue = () => {
    if (newValueInput.trim()) {
      setNewAllowedValues([...newAllowedValues, newValueInput.trim()]);
      setNewValueInput('');
    }
  };

  // Handler for removing a value from the new allowed values list
  const handleRemoveAllowedValue = (index: number) => {
    setNewAllowedValues(newAllowedValues.filter((_, i) => i !== index));
  };

  // Handler for adding a preset value
  const handleAddPreset = (preset: string) => {
    if (!newAllowedValues.includes(preset)) {
      setNewAllowedValues([...newAllowedValues, preset]);
    }
  };

  // Handler for adding or updating a rule
  const handleSaveRule = async () => {
    try {
      if (newAllowedValues.length === 0) {
        setError('Please add at least one allowed value');
        return;
      }

      const existingRule = rules.find(rule => rule.ruleType === newRuleType);
      
      if (existingRule) {
        // Update existing rule
        await updateTradingRule(existingRule.id!, {
          allowedValues: newAllowedValues
        });
      } else {
        // Create new rule
        await createTradingRule({
          userId,
          ruleType: newRuleType,
          allowedValues: newAllowedValues
        });
      }

      // Refresh rules
      const updatedRules = await getUserTradingRules(userId);
      setRules(updatedRules);
      
      // Reset form
      setShowAddForm(false);
      setNewRuleType('pair');
      setNewAllowedValues([]);
      setNewValueInput('');
      
      if (onRulesUpdated) {
        onRulesUpdated();
      }
    } catch (err) {
      console.error('Error saving rule:', err);
      setError('Failed to save trading rule');
    }
  };

  // Handler for deleting a rule
  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await deleteTradingRule(ruleId);
        setRules(rules.filter(rule => rule.id !== ruleId));
        
        if (onRulesUpdated) {
          onRulesUpdated();
        }
      } catch (err) {
        console.error('Error deleting rule:', err);
        setError('Failed to delete trading rule');
      }
    }
  };

  // Handler for editing a rule
  const handleEditRule = (rule: UserTradingRule) => {
    setNewRuleType(rule.ruleType);
    setNewAllowedValues([...rule.allowedValues]);
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Trading Rules for {userEmail}
        </h3>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Existing Rules List */}
        {rules.length > 0 ? (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-2">Current Rules</h4>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        {ruleTypeOptions.find(opt => opt.value === rule.ruleType)?.label || rule.ruleType}
                      </h5>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rule.allowedValues.map((value, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 text-center py-4 bg-gray-50 rounded-md">
            <p className="text-gray-500">No trading rules set for this user yet.</p>
          </div>
        )}

        {/* Add/Edit Rule Form */}
        {showAddForm ? (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="text-md font-medium text-gray-700 mb-4">
              {rules.some(r => r.ruleType === newRuleType) ? 'Edit Rule' : 'Add New Rule'}
            </h4>
            
            <div className="space-y-4">
              {/* Rule Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type
                </label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as any)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={rules.some(r => r.ruleType === newRuleType)}
                >
                  {ruleTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Common Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Common Values
                </label>
                <div className="flex flex-wrap gap-2">
                  {presets[newRuleType].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className={`inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        newAllowedValues.includes(preset) ? 'bg-indigo-100 border-indigo-300' : ''
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Custom Values */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add Custom Value
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={newRuleType === 'lot' ? 'e.g., 0.01-0.1' : 'Enter value'}
                  />
                  <button
                    type="button"
                    onClick={handleAddAllowedValue}
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm"
                  >
                    Add
                  </button>
                </div>
                {newRuleType === 'lot' && (
                  <p className="mt-1 text-sm text-gray-500">
                    For lot sizes, use format "min-max" (e.g., 0.01-0.5)
                  </p>
                )}
              </div>

              {/* Selected Values */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Values
                </label>
                {newAllowedValues.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {newAllowedValues.map((value, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => handleRemoveAllowedValue(index)}
                          className="ml-1.5 inline-flex text-indigo-400 hover:text-indigo-600 focus:outline-none"
                        >
                          <span className="sr-only">Remove</span>
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No values selected yet</div>
                )}
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewRuleType('pair');
                  setNewAllowedValues([]);
                  setNewValueInput('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Rule
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Trading Rule
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Close
        </button>
      </div>
    </div>
  );
} 