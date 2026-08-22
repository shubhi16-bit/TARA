import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, LogOut, Shield, MapPin, Mail, User as UserIcon } from 'lucide-react';

export default function Settings() {
  const { user, profile, logout, profileError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold text-brand-text">Authority Settings</h2>
        <p className="text-brand-muted mt-1 text-sm">Manage your authority profile and display preferences.</p>
      </header>

      {profileError && (
        <div className="mb-6 rounded-lg border border-risk-crit/30 bg-risk-crit/10 p-4 text-risk-crit text-sm">
          <p className="font-semibold">Authority Setup Alert:</p>
          <p className="mt-1">{profileError}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* PROFILE CARD */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-brand-text">Authority Profile</h3>
              <p className="text-xs text-brand-muted">Retrieved from Firestore authorities collection</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-brand-dark/40 rounded-lg border border-brand-border flex items-center gap-3">
              <UserIcon size={18} className="text-brand-muted" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-brand-muted">Officer Name</p>
                <p className="text-sm font-medium text-brand-text">{profile?.name || 'Authority Officer'}</p>
              </div>
            </div>

            <div className="p-3.5 bg-brand-dark/40 rounded-lg border border-brand-border flex items-center gap-3">
              <Mail size={18} className="text-brand-muted" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-brand-muted">Email Address</p>
                <p className="text-sm font-medium text-brand-text">{profile?.email || user?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="p-3.5 bg-brand-dark/40 rounded-lg border border-brand-border flex items-center gap-3">
              <MapPin size={18} className="text-brand-muted" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-brand-muted">Assigned City</p>
                <p className="text-sm font-medium text-brand-text">{profile?.city || 'Unassigned (Please configure in Firestore)'}</p>
              </div>
            </div>

            <div className="p-3.5 bg-brand-dark/40 rounded-lg border border-brand-border flex items-center gap-3">
              <Shield size={18} className="text-brand-muted" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-brand-muted">Role / Clearance</p>
                <p className="text-sm font-medium text-brand-text">{profile?.role || 'Authority Command'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PREFERENCES */}
        <div className="bg-brand-surface rounded-xl border border-brand-border p-6 shadow-sm">
          <h3 className="text-base font-semibold text-brand-text mb-4">Interface Preferences</h3>
          
          <div className="flex items-center justify-between py-3 border-b border-brand-border">
            <div>
              <p className="text-sm font-medium text-brand-text">Theme Mode</p>
              <p className="text-xs text-brand-muted">Switch between professional Dark and Light mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-border bg-brand-dark text-sm font-medium text-brand-text hover:bg-brand-border transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between py-3 pt-4">
            <div>
              <p className="text-sm font-medium text-brand-text">Account Session</p>
              <p className="text-xs text-brand-muted">Terminate your current authority command session</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-risk-crit bg-risk-crit/10 border border-risk-crit/20 hover:bg-risk-crit/20 transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

