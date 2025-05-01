import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { UserImpersonationProvider } from './contexts/UserImpersonationContext';
import { JitsiControlProvider } from './contexts/JitsiControlContext';
import Dashboard from './pages/Dashboard';
import LogTrade from './pages/LogTrade';
import Performance from './pages/Performance';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
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

// --- Webinar Access Guard --- 
function WebinarAccessGuard() {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(() => 
    sessionStorage.getItem('webinarAccessGranted') === 'true'
  );

  useEffect(() => {
    if (!hasAccess) {
      const code = window.prompt('Please enter the access code for the live webinar:');
      if (code === '7sjsd858') {
        sessionStorage.setItem('webinarAccessGranted', 'true');
        setHasAccess(true);
      } else {
        // Handle incorrect code or cancellation
        if (code !== null) { // Only alert if they entered something wrong
          alert('Incorrect access code.');
        }
        navigate('/performance'); // Navigate back to a default page
      }
    }
  }, [hasAccess, navigate]); // Rerun if hasAccess changes or navigate function changes

  // Render the page only if access has been granted
  // Render null while checking/prompting to avoid rendering the page prematurely
  return hasAccess ? <LiveWebinarPage /> : null; 
}
// --- End Webinar Access Guard ---

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/performance" /> : <Auth />}
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
            {/* Use the guard component here */}
            <WebinarAccessGuard /> 
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

  const requestJitsiFullscreen = useCallback(() => {
    jitsiContainerRef.current?.requestFullscreen().catch(err => {
      console.error('Error attempting Jitsi fullscreen:', err);
    });
  }, []);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let api: any = null;

    const handleConferenceLeft = () => {
      console.log("Jitsi Conference Left - Navigating away...");
      // Check if still on webinar page before navigating
      // This prevents navigating if already navigated away manually
      if (location.pathname === '/live-webinar') {
        navigate('/performance'); 
      }
      // Clean up API ref regardless
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
        // If we navigated away manually (or prompt failed) and API still exists, clean it up
        jitsiApiRef.current.removeListener('videoConferenceLeft', handleConferenceLeft);
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
    }

    return () => {
      // Remove listener on cleanup
      jitsiApiRef.current?.removeListener('videoConferenceLeft', handleConferenceLeft);
      // Only dispose API if it exists *and* we are navigating *away* from the webinar page
      // or the component is fully unmounting.
      // The 'else if' block above handles manual navigation away.
      // This handles the case where the App itself unmounts while on the webinar page.
      if (jitsiApiRef.current) {
         jitsiApiRef.current.dispose();
         jitsiApiRef.current = null; 
      }
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isWebinarActive, navigate, location.pathname]); // Added location.pathname to dependencies

  return (
    <JitsiControlProvider value={{ requestJitsiFullscreen }}>
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
    </JitsiControlProvider>
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