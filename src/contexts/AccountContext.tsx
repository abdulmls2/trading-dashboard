import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserTradingAccounts, createTradingAccount, setDefaultTradingAccount, updateTradingAccount, deleteTradingAccount } from '../lib/api';
import { useAuth } from './AuthContext';

interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AccountContextType {
  accounts: TradingAccount[];
  currentAccount: TradingAccount | null;
  isLoading: boolean;
  loadAccounts: () => Promise<void>;
  createAccount: (name: string, description: string, isDefault: boolean) => Promise<TradingAccount>;
  updateAccount: (id: string, updates: {name?: string; description?: string; isDefault?: boolean}) => Promise<TradingAccount>;
  deleteAccount: (id: string) => Promise<void>;
  setCurrentAccount: (account: TradingAccount) => void;
  setDefaultAccount: (id: string) => Promise<TradingAccount>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<TradingAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccounts = async () => {
    if (!user) {
      setAccounts([]);
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const accountsData = await getUserTradingAccounts();
      setAccounts(accountsData);

      // If no accounts exist, create a default one
      if (accountsData.length === 0) {
        const defaultAccount = await createTradingAccount('Default Account', 'My primary trading account', true);
        setAccounts([defaultAccount]);
        setCurrentAccount(defaultAccount);
      } else {
        // Find the default account or use the first one
        const defaultAccount = accountsData.find(account => account.is_default) || accountsData[0];
        setCurrentAccount(defaultAccount);
      }
    } catch (error) {
      console.error('Error loading trading accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (name: string, description: string, isDefault: boolean) => {
    const newAccount = await createTradingAccount(name, description, isDefault);
    await loadAccounts();
    return newAccount;
  };

  const updateAccount = async (id: string, updates: {name?: string; description?: string; isDefault?: boolean}) => {
    const updatedAccount = await updateTradingAccount(id, updates);
    await loadAccounts();
    if (currentAccount && currentAccount.id === id) {
      setCurrentAccount(updatedAccount);
    }
    return updatedAccount;
  };

  const deleteAccount = async (id: string) => {
    await deleteTradingAccount(id);
    await loadAccounts();
  };

  const setDefaultAccount = async (id: string) => {
    const defaultAccount = await setDefaultTradingAccount(id);
    await loadAccounts();
    setCurrentAccount(defaultAccount);
    return defaultAccount;
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const value = {
    accounts,
    currentAccount,
    isLoading,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setCurrentAccount,
    setDefaultAccount
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}; 