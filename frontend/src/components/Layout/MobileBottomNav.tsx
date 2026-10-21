import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  FilePlus2, 
  Users, 
  Menu 
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface MobileBottomNavProps {
  currentTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = currentTab ? currentTab === 'dashboard' : (location.pathname === '/' || location.pathname.startsWith('/dashboard'));
  const isQuotations = currentTab ? currentTab === 'quotations' : (location.pathname.startsWith('/quotations') && location.pathname !== '/quotations/new');
  const isCreate = currentTab ? currentTab === 'create-quotation' : location.pathname === '/quotations/new';
  const isClients = currentTab ? currentTab === 'clients' : location.pathname.startsWith('/clients');

  const handleNav = (tab: NavTab, path: string) => {
    if (onSelectTab) onSelectTab(tab);
    navigate(path);
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 text-slate-300 px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around no-print shadow-[0_-4px_20px_rgba(0,0,0,0.5)] h-[calc(4.25rem+env(safe-area-inset-bottom,0px))]"
    >
      <button
        onClick={() => handleNav('dashboard', '/dashboard')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl min-h-[48px] min-w-[56px] text-xs font-medium transition-colors cursor-pointer ${
          isDashboard ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200 active:text-white'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[11px]">Home</span>
      </button>

      <button
        onClick={() => handleNav('quotations', '/quotations')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl min-h-[48px] min-w-[56px] text-xs font-medium transition-colors cursor-pointer ${
          isQuotations ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200 active:text-white'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[11px]">Quotes</span>
      </button>

      {/* Primary Floating Action Center Button */}
      <button
        onClick={() => handleNav('create-quotation', '/quotations/new')}
        className="flex flex-col items-center -mt-6 cursor-pointer active:scale-95 transition-transform"
        aria-label="Create Quotation"
      >
        <div className={`w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 via-sky-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/40 ring-4 ${isCreate ? 'ring-sky-400' : 'ring-slate-950'}`}>
          <FilePlus2 className="w-6 h-6" />
        </div>
        <span className={`text-[10px] font-bold mt-1 ${isCreate ? 'text-white' : 'text-sky-400'}`}>Create</span>
      </button>

      <button
        onClick={() => handleNav('clients', '/clients')}
        className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl min-h-[48px] min-w-[56px] text-xs font-medium transition-colors cursor-pointer ${
          isClients ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200 active:text-white'
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[11px]">Clients</span>
      </button>


      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl min-h-[48px] min-w-[56px] text-xs font-medium text-slate-400 hover:text-slate-200 active:text-white transition-colors cursor-pointer"
        aria-label="Open Menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[11px]">Menu</span>
      </button>
    </nav>
  );
};
