import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { UserImpersonationProvider } from './contexts/UserImpersonationContext';
import Dashboard from './pages/Dashboard';
import LogTrade from './pages/LogTrade';
import Performance from './pages/Performance';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TradesAnalysis from './pages/TradesAnalysis';
import Calendar from './pages/Calendar';
import Journal from './pages/Journal';
import Layout from './components/Layout';
import PerformanceOverview from './pages/PerformanceOverview';
import Pip from './pages/Pip';
import WebinarPage from './pages/WebinarPage';
import Compounding from './pages/Compounding';
import LiveWebinarPage from './pages/LiveWebinarPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/performance" /> : <Auth />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/performance" /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Navigate to="/performance" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/log-trade"
        element={
          <PrivateRoute>
            <LogTrade />
          </PrivateRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <PrivateRoute>
            <PerformanceOverview />
          </PrivateRoute>
        }
      />
      <Route
        path="/trades-analysis"
        element={
          <PrivateRoute>
            <TradesAnalysis />
          </PrivateRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <PrivateRoute>
            <Calendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <PrivateRoute>
            <Journal />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/user-performance/:userId"
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/pip"
        element={
          <PrivateRoute>
            <Pip />
          </PrivateRoute>
        }
      />
      <Route
        path="/webinar"
        element={
          <PrivateRoute>
            <WebinarPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/live-webinar"
        element={
          <PrivateRoute>
            <LiveWebinarPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/compounding"
        element={
          <PrivateRoute>
            <Compounding />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const jitsiApiRef = useRef<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const isWebinarActive = location.pathname === '/live-webinar';

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let api: any = null;

    const handleConferenceLeft = () => {
      console.log("Jitsi Conference Left - Navigating away...");
      navigate('/performance');
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
    };

    if (isWebinarActive && !jitsiApiRef.current) {
      script = document.createElement('script');
      script.src = 'https://8x8.vc/vpaas-magic-cookie-0d3bdcb9d83a4dffa3766acaf094f10d/external_api.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const checkContainer = setInterval(() => {
          if (jitsiContainerRef.current) {
            clearInterval(checkContainer);
            api = new (window as any).JitsiMeetExternalAPI("8x8.vc", {
              roomName: "vpaas-magic-cookie-0d3bdcb9d83a4dffa3766acaf094f10d/WebinarComeLearnForex",
              parentNode: jitsiContainerRef.current,
              configOverwrite: {
                toolbarButtons: [
                  'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting',
                  'feedback', 'filmstrip', 'hangup', 'profile', 'chat',
                  'recording', 'livestreaming', 'etherpad', 'sharedvideo', 'settings',
                  'raisehand', 'videoquality', 'select-background', 'stats', 'shortcuts',
                  'tileview', 'download', 'help', 'mute-everyone', 'security'
                ],
              },
              interfaceConfigOverwrite: {
                  filmStripOnly: false,
                  SHOW_JITSI_WATERMARK: false,
              },
            });
            jitsiApiRef.current = api;

            api.addListener('videoConferenceLeft', handleConferenceLeft);

          }
        }, 100);
      };
    } else if (!isWebinarActive && jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
    }

    return () => {
      jitsiApiRef.current?.removeListener('videoConferenceLeft', handleConferenceLeft);
      
      if(jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null; 
      }
      
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isWebinarActive, navigate]);

  return (
    <UserImpersonationProvider>
      <AuthProvider>
        <AccountProvider>
          <AppRoutes />
          {isWebinarActive && (
            <div
              ref={jitsiContainerRef}
              id="jaas-container"
              className="fixed inset-0 z-0"
            />
          )}
        </AccountProvider>
      </AuthProvider>
    </UserImpersonationProvider>
  );
}

function RootApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default RootApp;