import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import QuickActions from '../components/QuickActions';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ role: string } | null>(null);

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    }

    getProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Track and improve your trades today.
            {profile?.role === 'admin' ? (
              <span className="text-indigo-600"> You are an Admin</span>
            ) : (
              <span className="text-gray-600"> You are a normal user</span>
            )}
          </h1>
          <QuickActions />
        </div>
      </main>
    </div>
  );
}