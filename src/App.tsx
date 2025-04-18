import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;