import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, AlertTriangle, TrendingUp, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const navItems = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Map', path: '/map', icon: Map },
  { name: 'Action Priority', path: '/priority', icon: AlertTriangle },
  { name: 'Analytics', path: '/analytics', icon: TrendingUp },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="w-64 bg-brand-surface h-screen border-r border-brand-border flex flex-col fixed shadow-sm">
      <div className="p-6 border-b border-brand-border">
        <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
          <span className="text-primary">●</span> TARA
        </h1>
        <p className="text-xs text-brand-muted mt-1 uppercase tracking-widest font-semibold">Command Center</p>
        {profile?.city && (
          <p className="text-xs text-brand-text mt-2 font-medium bg-brand-dark px-2 py-1 rounded inline-block border border-brand-border">
            {profile.city}
          </p>
        )}
      </div>
      <nav className="flex-1 mt-4 overflow-y-auto">
        <ul className="px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className="mb-1">
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-brand-muted hover:bg-brand-border hover:text-brand-text'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-brand-border flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-brand-muted hover:bg-brand-border hover:text-brand-text w-full text-left"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-risk-crit hover:bg-risk-crit/10 hover:text-risk-crit w-full text-left"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
