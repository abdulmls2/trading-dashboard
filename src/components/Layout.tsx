import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useUserImpersonation } from '../contexts/UserImpersonationContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAdmin, effectiveUserId } = useAuth();
  const { isImpersonating, impersonatedUser, stopImpersonation } = useUserImpersonation();
  
  // Calculate if we need to show the admin banner
  const showAdminBanner = isAdmin && isImpersonating && impersonatedUser;

  // Add debug logging
  useEffect(() => {
    if (showAdminBanner) {
      console.log("Layout: Admin banner shown for impersonated user:", impersonatedUser);
      console.log("Layout: Effective user ID:", effectiveUserId);
    }
  }, [showAdminBanner, impersonatedUser, effectiveUserId]);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 ${showAdminBanner ? 'pt-12' : ''}`}>
        {/* Admin impersonation banner */}
        {showAdminBanner && (
          <div className="fixed top-0 left-0 right-0 bg-indigo-600 text-white z-50 p-2 shadow-md">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div>
                <span className="font-semibold">Admin Mode:</span> Viewing dashboard as {impersonatedUser?.full_name || impersonatedUser?.email} 
                <span className="ml-2 text-xs opacity-70">(ID: {impersonatedUser?.user_id})</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => stopImpersonation()}
                  className="px-3 py-1 bg-white text-indigo-600 rounded hover:bg-indigo-100 font-medium text-sm"
                >
                  Exit User View
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* The actual page content will be rendered here */}
        {children}
      </main>
    </div>
  );
};

export default Layout; 