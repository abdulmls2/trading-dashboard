import React, { createContext, useContext, useCallback } from 'react';

interface JitsiControlContextType {
  requestJitsiFullscreen: () => void;
}

const JitsiControlContext = createContext<JitsiControlContextType | null>(null);

export const useJitsiControl = () => {
  const context = useContext(JitsiControlContext);
  if (!context) {
    throw new Error('useJitsiControl must be used within a JitsiControlProvider');
  }
  return context;
};

// Provider component will be used in App.tsx
export const JitsiControlProvider = JitsiControlContext.Provider; 