import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
}

// Import the actual UserImpersonationContext to avoid circular dependencies
import { useUserImpersonation } from './UserImpersonationContext';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  effectiveUser: UserProfile | null; // Either impersonated user or actual user profile
  effectiveUserId: string | null; // Helper to get the effective user ID
  loading: boolean;
  isAdmin: boolean;
  isImpersonating: () => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string, level: number | null) => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Wrapper component that handles auth state
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      setLoading(false);
      return;
    }
    
    setUserProfile(data);
    setIsAdmin(data.role === 'admin');
    setLoading(false);
  };

  const signUp = async (email: string, password: string, username: string, fullName: string, level: number | null = null) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase signUp error:', error);
      throw error;
    }
    
    if (data.user) {
      console.log('User signed up, attempting to create profile for:', data.user.id);
      console.log('Profile data:', { userId: data.user.id, username, fullName, email, level });
      
      // Create a profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          username,
          full_name: fullName,
          email, // Also include email in the profile
          role: 'normal', // Default role for new users
          level, // Add the level field
        }, {
          onConflict: 'user_id' // Specify the conflict target column
        });
        
      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        throw profileError;
      } else {
        console.log('Profile created/updated successfully for user:', data.user.id);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContextWithImpersonation 
      user={user}
      userProfile={userProfile}
      loading={loading}
      isAdmin={isAdmin}
      signIn={signIn}
      signUp={signUp}
      signOut={signOut}
    >
      {children}
    </AuthContextWithImpersonation>
  );
}

// Component that combines auth state with impersonation state
function AuthContextWithImpersonation({
  children,
  user,
  userProfile,
  loading,
  isAdmin,
  signIn,
  signUp,
  signOut
}: {
  children: React.ReactNode;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string, level: number | null) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  // Use the UserImpersonationContext to get impersonation state
  let impersonationContext;
  try {
    impersonationContext = useUserImpersonation();
  } catch (e) {
    // If not provided, create a mock one
    impersonationContext = {
      impersonatedUser: null,
      isImpersonating: false,
      getImpersonatedUserId: () => null
    } as any;
  }

  // Function to determine if we're currently impersonating a user
  const isImpersonating = () => {
    return !!impersonationContext?.impersonatedUser;
  };

  // Get the effective user (either the impersonated user or the actual logged-in user)
  const effectiveUser = impersonationContext?.impersonatedUser || userProfile;
  
  // Get the effective user ID
  const effectiveUserId = impersonationContext?.getImpersonatedUserId() || userProfile?.user_id || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile,
      effectiveUser,
      effectiveUserId,
      loading, 
      isAdmin,
      isImpersonating,
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}