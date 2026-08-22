import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, AlertTriangle, TrendingUp, Settings } from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Map', path: '/map', icon: Map },
  { name: 'Action Priority', path: '/priority', icon: AlertTriangle },
  { name: 'Analytics', path: '/analytics', icon: TrendingUp },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-brand-surface h-screen border-r border-brand-border flex flex-col fixed shadow-sm">
      <div className="p-6 border-b border-brand-border">
        <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
          <span className="text-primary"></span> TARA
        </h1>
        <p className="text-xs text-brand-muted mt-1 uppercase tracking-widest font-semibold">Command Center</p>
      </div>
      <nav className="flex-1 mt-4">
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
    </div>
  );
}
