import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TwoFactorSetupModal } from '../Auth/TwoFactorSetupModal';
import { 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Shield,
  Menu,
  Download
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title }) => {
  const { user, isAdmin, settings, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  const getPageTitle = (): string => {
    if (title) return title;
    const path = location.pathname;
    if (path === '/' || path.startsWith('/dashboard')) return 'DASHBOARD';
    if (path === '/quotations/new') return 'CREATE QUOTATION';
    if (/^\/quotations\/\d+\/edit$/.test(path)) return 'EDIT QUOTATION';
    if (/^\/quotations\/\d+$/.test(path)) return 'QUOTATION DETAILS';
    if (path.startsWith('/quotations')) return isAdmin ? 'ALL QUOTATIONS' : 'MY QUOTATIONS';
    if (path.startsWith('/clients')) return 'CLIENTS CRM';
    if (path.startsWith('/events')) return 'SHOOTS & EVENTS';
    if (path.startsWith('/services')) return 'SERVICES & PRICES';
    if (path.startsWith('/event-types')) return 'EVENT TYPES';
    if (path.startsWith('/reports') || path.startsWith('/analytics')) return 'BUSINESS ANALYTICS';
    if (path.startsWith('/users') || path.startsWith('/staff')) return 'STAFF & ACCESS';
    if (path.startsWith('/settings')) return 'STUDIO SETTINGS';
    if (path.startsWith('/backup')) return 'BACKUP & RESTORE';
    if (path.startsWith('/audit-logs')) return 'AUDIT LOGS';
    return '';
  };

  const displayTitle = getPageTitle();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    setShow2FAModal(false);
  }, [location.pathname]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    }
  };

  const studioName = settings?.studio_name || 'STUDIO PHOTOGRAPHY';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 sm:px-6 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 sm:py-3 no-print">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left section: Drawer Toggle & Studio Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 focus:outline-none min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
            title="Go to Dashboard"
          >
            <img
              src={settings?.logo || '/logo.jpg'}
              alt={studioName}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover ring-1 ring-sky-500/30 shadow-md shadow-sky-500/10 shrink-0 group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                <span className="truncate group-hover:text-sky-300 transition-colors">{studioName}</span>
                <span className="hidden md:inline-block text-[10px] font-semibold text-sky-400 border border-sky-800/50 bg-sky-950/40 px-1.5 py-0.5 rounded shrink-0">
                  QUOTATIONS
                </span>
              </h1>
              {displayTitle && (
                <p className="text-[11px] text-slate-400 hidden sm:block truncate font-medium">
                  {displayTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right section: Install button & User Info */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          
          {/* Install App button if prompt available */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/25 transition-all cursor-pointer min-h-[36px]"
              title="Install PWA App to Home Screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}

          {/* User badge & 2FA & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 2FA Security Button */}
            <button
              onClick={() => setShow2FAModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-colors cursor-pointer min-h-[36px] ${
                user?.two_factor_enabled
                  ? 'bg-emerald-950/50 hover:bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
              title={user?.two_factor_enabled ? 'Google Authenticator Active (Click to manage)' : 'Set up Google Authenticator (TOTP)'}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${user?.two_factor_enabled ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline font-semibold text-[11px]">
                {user?.two_factor_enabled ? '2FA Active' : '2FA Setup'}
              </span>
            </button>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center justify-end gap-1">
                {isAdmin ? (
                  <ShieldCheck className="w-3 h-3 text-sky-400" />
                ) : (
                  <UserIcon className="w-3 h-3 text-slate-400" />
                )}
                {user?.role === 'ADMIN' ? 'Admin' : 'Quotation Staff'}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Google Authenticator Setup & Management Modal */}
      <TwoFactorSetupModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
      />
    </header>
  );
};
