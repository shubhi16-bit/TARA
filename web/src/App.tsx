import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import ActionPriority from './pages/ActionPriority';
import CrimeInsights from './pages/CrimeInsights';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-brand-dark text-brand-text">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-brand-dark text-brand-text">Loading...</div>;
  }

  if (isLoginPage) {
    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/priority" element={<ActionPriority />} />
          <Route path="/analytics" element={<CrimeInsights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
