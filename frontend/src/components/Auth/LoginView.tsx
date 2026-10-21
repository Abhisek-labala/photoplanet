import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Lock, User, AlertCircle, Camera, Shield, Eye, EyeOff } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, settings } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studioName = settings?.studio_name || 'STUDIO PHOTOGRAPHY';
  const tagline = settings?.tagline || 'Quotation Management System • Offline First';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ username: username.trim(), password });
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoUser: 'admin' | 'quotation') => {
    setUsername(demoUser);
    setPassword('ChangeMe123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 py-6">
        
        {/* Studio Branding Card */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl mb-4 ring-1 ring-sky-500/20">
            <img 
              src={settings?.logo || '/logo.jpg'} 
              alt={studioName} 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase px-2">
            {studioName}
          </h1>
          <p className="text-xs text-sky-400 mt-1 uppercase tracking-wider font-semibold px-4">
            {tagline}
          </p>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-base sm:text-lg font-bold text-white mb-1">Sign In</h2>
          <p className="text-xs text-slate-400 mb-5">Enter your studio credentials to access quotations</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or quotation"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors min-h-[48px]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors min-h-[48px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold text-sm text-white shadow-lg shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              One-Click Demo Credentials
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group active:scale-98"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 group-hover:text-sky-300">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('quotation')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer group active:scale-98"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 group-hover:text-blue-300">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Staff</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">quotation</div>
              </button>
            </div>

            <p className="mt-4 text-[11px] text-amber-400/90 text-center leading-relaxed">
              ⚠️ <strong>Security Notice:</strong> Change default passwords under Staff & Access after first login.
            </p>
          </div>

        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          Local SQLite Database • Connected to Studio Wi-Fi
        </div>

      </div>
    </div>
  );
};
