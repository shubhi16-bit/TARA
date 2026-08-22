import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import ActionPriority from './pages/ActionPriority';
import CrimeInsights from './pages/CrimeInsights'; // We will use this for Analytics
import Login from './pages/Login';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/priority" element={<ActionPriority />} />
        <Route path="/analytics" element={<CrimeInsights />} />
        <Route path="/settings" element={<div className="p-8 text-brand-muted">Settings (WIP)</div>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
