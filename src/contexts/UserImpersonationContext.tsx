import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
}

interface ImpersonationContextType {
  impersonatedUser: UserProfile | null;
  isImpersonating: boolean;
  startImpersonation: (user: UserProfile) => void;
  stopImpersonation: () => void;
  redirectToUserSection: (section: string) => void;
  getImpersonatedUserId: () => string | null;
}

const UserImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

// LocalStorage key for storing impersonation state
const IMPERSONATION_STORAGE_KEY = 'impersonatedUser';

export function UserImpersonationProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage if available
  const getInitialImpersonatedUser = (): UserProfile | null => {
    try {
      const storedUser = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error retrieving impersonation state from localStorage:', error);
      return null;
    }
  };

  const [impersonatedUser, setImpersonatedUser] = useState<UserProfile | null>(getInitialImpersonatedUser());
  const navigate = useNavigate();

  const isImpersonating = impersonatedUser !== null;

  // Persist impersonation state to localStorage whenever it changes
  useEffect(() => {
    if (impersonatedUser) {
      console.log("Persisting impersonation state for user:", impersonatedUser.user_id, impersonatedUser.email);
      localStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(impersonatedUser));
    } else {
      console.log("Clearing impersonation state from localStorage");
      localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
  }, [impersonatedUser]);

  // When impersonation starts, log the user being impersonated for debugging
  useEffect(() => {
    if (impersonatedUser) {
      console.log("Now impersonating user:", impersonatedUser.user_id, impersonatedUser.email);
    }
  }, [impersonatedUser]);

  const startImpersonation = (user: UserProfile) => {
    console.log("Starting impersonation of user:", user.user_id, user.email);
    setImpersonatedUser(user);
  };

  const stopImpersonation = () => {
    console.log("Stopping impersonation");
    setImpersonatedUser(null);
    navigate('/admin');
  };

  // Helper function to get the impersonated user ID
  const getImpersonatedUserId = (): string | null => {
    return impersonatedUser?.user_id || null;
  };

  // Navigate to user's section (journal, performance, etc.) while impersonating
  const redirectToUserSection = (section: string) => {
    if (!isImpersonating) return;
    
    // Map of sections to their routes
    const sectionRoutes: Record<string, string> = {
      'journal': '/journal',
      'performance': '/performance',
      'calendar': '/calendar',
      'trades-analysis': '/trades-analysis',
      'profile': '/profile'
    };

    if (sectionRoutes[section]) {
      navigate(sectionRoutes[section]);
    }
  };

  return (
    <UserImpersonationContext.Provider 
      value={{ 
        impersonatedUser, 
        isImpersonating, 
        startImpersonation, 
        stopImpersonation,
        redirectToUserSection,
        getImpersonatedUserId
      }}
    >
      {children}
    </UserImpersonationContext.Provider>
  );
}

export function useUserImpersonation() {
  const context = useContext(UserImpersonationContext);
  if (context === undefined) {
    throw new Error('useUserImpersonation must be used within a UserImpersonationProvider');
  }
  return context;
} 