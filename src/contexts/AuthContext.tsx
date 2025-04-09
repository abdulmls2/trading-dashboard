import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
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
      console.log('Profile data:', { userId: data.user.id, username, fullName, email });
      
      // Create a profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          username,
          full_name: fullName,
          email // Also include email in the profile
        }, {
          onConflict: 'user_id' // Specify the conflict target column
        });
        
      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        // Decide if you want to throw the error here. 
        // If you throw, the user might see the sign-up fail.
        // If you don't throw, sign-up succeeds but profile is incomplete.
        throw profileError; // Let's keep throwing for now to make errors visible
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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