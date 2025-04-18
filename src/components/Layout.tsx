import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // We might need to share the collapsed state if the main content
  // needs to adjust its margin/padding based on the sidebar width.
  // For now, let's keep it simple.

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
        {/* The actual page content will be rendered here */}
        {children}
      </main>
    </div>
  );
};

export default Layout; 