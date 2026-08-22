import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Metropolis');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Save city to localStorage to simulate auth session passing location
    localStorage.setItem('authCity', city);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center relative overflow-hidden">
      {/* Street/Light themed vector background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-20">
        <div className="absolute top-[20%] left-[10%] w-32 h-32 bg-risk-mod rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] right-[20%] w-64 h-64 bg-primary rounded-full blur-[120px]"></div>
        {/* Vector road lines */}
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,800 Q400,600 800,900 T1920,500" fill="none" stroke="#333" strokeWidth="2" strokeDasharray="20 10"/>
        </svg>
      </div>

      <div className="z-10 bg-brand-surface p-8 rounded-xl border border-brand-border shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-text flex justify-center items-center gap-2 mb-2">
            <span className="text-risk-mod">●</span> TARA
          </h1>
          <p className="text-brand-muted text-sm uppercase tracking-widest font-semibold">Authority Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded px-4 py-2 text-brand-text focus:outline-none focus:border-risk-mod transition-colors"
              placeholder="authority@city.gov"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded px-4 py-2 text-brand-text focus:outline-none focus:border-risk-mod transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Assigned City / Region</label>
            <select 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded px-4 py-2 text-brand-text focus:outline-none focus:border-risk-mod transition-colors"
            >
              <option value="New Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Metropolis">Metropolis (Demo)</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="w-full bg-risk-mod text-white font-semibold py-2.5 rounded hover:bg-risk-mod/90 transition-colors mt-4"
          >
            Access Command Center
          </button>
        </form>
      </div>
    </div>
  );
}
