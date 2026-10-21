import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Wifi, 
  WifiOff, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  QrCode, 
  X, 
  Copy, 
  Check, 
  Menu,
  Download,
  Smartphone,
  Share2
} from 'lucide-react';
import { api } from '../../services/api';

interface NavbarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title }) => {
  const { user, isAdmin, isServerConnected, settings, logout } = useAuth();
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      fetchNetworkInfo();
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const data = await api.getNetworkInfo();
      setNetworkInfo(data);
      setShowNetworkModal(true);
    } catch {
      setShowNetworkModal(true);
    }
  };

  const copyUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const studioName = settings?.studio_name || 'STUDIO PHOTOGRAPHY';

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 sm:px-6 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 sm:py-3 no-print">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
          
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

            <div className="flex items-center gap-2.5 sm:gap-3">
              <img
                src={settings?.logo || '/logo.jpg'}
                alt={studioName}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover ring-1 ring-sky-500/30 shadow-md shadow-sky-500/10 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{studioName}</span>
                  <span className="hidden md:inline-block text-[10px] font-semibold text-sky-400 border border-sky-800/50 bg-sky-950/40 px-1.5 py-0.5 rounded shrink-0">
                    QUOTATIONS
                  </span>
                </h1>
                {title && (
                  <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                    {title}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Connection pill & User info */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Connection Status Pill */}
            <button
              onClick={fetchNetworkInfo}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer min-h-[36px] ${
                isServerConnected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40 animate-pulse'
              }`}
              title="Click to view Wi-Fi network connection address"
            >
              {isServerConnected ? (
                <>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden sm:inline">Local Server Connected</span>
                  <span className="sm:hidden">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Connection Lost</span>
                  <span className="sm:hidden">Offline</span>
                </>
              )}
            </button>

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

            {/* Mobile Wi-Fi QR / IP Info Trigger */}
            <button
              onClick={fetchNetworkInfo}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title="Multi-Device Wi-Fi Setup & PWA Installation"
              aria-label="Multi-Device Setup"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
            </button>

            {/* User badge */}
            <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-800">
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
      </header>

      {/* Network & Multi-Device Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowNetworkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-800/40 text-sky-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">How to Use & Install as PWA</h3>
                <p className="text-xs text-slate-400">Install standalone app on phones, tablets & PC</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              
              {/* Direct 1-click Install button if available */}
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950 to-blue-950 border border-sky-600/40 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Instant 1-Click Install</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Click below to install directly to this device</p>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md shadow-sky-500/30 flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Now</span>
                  </button>
                </div>
              )}

              {/* Wi-Fi URL section */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Connect Phone/Tablet to Studio Wi-Fi and open:
                </label>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
                  <code className="text-sky-400 font-mono text-xs sm:text-sm break-all font-semibold">
                    {networkInfo?.networkUrl || `http://${window.location.hostname}:3000`}
                  </code>
                  <button
                    onClick={() => copyUrl(networkInfo?.networkUrl || `http://${window.location.hostname}:3000`)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Platform-specific instructions */}
              <div className="space-y-2.5 text-xs text-slate-300">
                <label className="block text-xs font-semibold text-slate-300">
                  2. Install to Home Screen on your device:
                </label>

                {/* Android Guide */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>📱 Android (Chrome / Edge / Brave):</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Tap the <strong>three dots menu (⋮)</strong> at top right &rarr; tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>

                {/* iPhone / iPad Guide */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-sky-400 flex items-center gap-1.5">
                    <span>🍎 iPhone / iPad (Safari):</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Tap the <strong>Share button</strong> (square with arrow up at bottom) &rarr; scroll down &rarr; tap <strong>"Add to Home Screen"</strong> &rarr; tap <strong>"Add"</strong>.
                  </p>
                </div>

                {/* Windows / Mac Guide */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-purple-400 flex items-center gap-1.5">
                    <span>💻 Windows PC / Mac (Chrome / Edge):</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Look for the <strong>Install icon (⊕)</strong> on the right side of the address bar &rarr; click <strong>"Install"</strong>.
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-slate-800/40 rounded-2xl p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block">✨ PWA Features:</span>
                <p>• Opens in full-screen standalone window without browser URL bars.</p>
                <p>• Service worker caches the application so it loads instantly even with unstable Wi-Fi.</p>
                <p>• Multiple staff devices save and sync to the studio host database in real time.</p>
              </div>

              <button
                onClick={() => setShowNetworkModal(false)}
                className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 font-semibold text-white transition-colors cursor-pointer text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
