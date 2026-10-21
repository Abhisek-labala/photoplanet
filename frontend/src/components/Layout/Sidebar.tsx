import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  Users,
  Calendar,
  Layers,
  CalendarDays,
  BarChart3,
  UserCheck,
  Settings as SettingsIcon,
  Database,
  History,
  X
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'quotations'
  | 'create-quotation'
  | 'clients'
  | 'events'
  | 'services'
  | 'event-types'
  | 'reports'
  | 'users'
  | 'settings'
  | 'backup'
  | 'audit-logs';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onClose }) => {
  const { isAdmin, settings } = useAuth();

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  const navItemClass = (tab: NavTab) => `
    flex items-center gap-3 px-3.5 py-3 rounded-2xl font-medium text-sm transition-all cursor-pointer min-h-[46px] ${
      currentTab === tab
        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25 font-semibold'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800'
    }
  `;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden no-print transition-opacity"
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-40
        w-72 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between
        transition-transform duration-200 ease-in-out no-print shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          {/* Header in mobile drawer */}
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800 lg:hidden">
            <span className="font-bold text-white text-base">Navigation</span>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create Quotation Button */}
          <button
            onClick={() => handleNavClick('create-quotation')}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 mb-5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-sky-500/25 transition-all cursor-pointer min-h-[48px]"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>

          {/* Core Navigation Section */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3.5 py-1.5">
              Workspace
            </div>

            <button onClick={() => handleNavClick('dashboard')} className={navItemClass('dashboard')}>
              <LayoutDashboard className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button onClick={() => handleNavClick('quotations')} className={navItemClass('quotations')}>
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span>All Quotations</span>
            </button>

            <button onClick={() => handleNavClick('clients')} className={navItemClass('clients')}>
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Clients CRM</span>
            </button>

            <button onClick={() => handleNavClick('events')} className={navItemClass('events')}>
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Shoots & Events</span>
            </button>
          </div>

          {/* Admin Management Section */}
          {isAdmin && (
            <div className="mt-5 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3.5 py-1.5 flex items-center justify-between">
                <span>Studio Admin</span>
                <span className="text-[9px] bg-sky-950 text-sky-400 border border-sky-800/40 px-1.5 py-0.5 rounded font-mono">
                  MASTER
                </span>
              </div>

              <button onClick={() => handleNavClick('services')} className={navItemClass('services')}>
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Services & Prices</span>
              </button>

              <button onClick={() => handleNavClick('event-types')} className={navItemClass('event-types')}>
                <CalendarDays className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Event Types</span>
              </button>

              <button onClick={() => handleNavClick('reports')} className={navItemClass('reports')}>
                <BarChart3 className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Business Analytics</span>
              </button>

              <button onClick={() => handleNavClick('users')} className={navItemClass('users')}>
                <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Staff & Access</span>
              </button>

              <button onClick={() => handleNavClick('settings')} className={navItemClass('settings')}>
                <SettingsIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Studio Settings</span>
              </button>

              <button onClick={() => handleNavClick('backup')} className={navItemClass('backup')}>
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Backup & Restore</span>
              </button>

              <button onClick={() => handleNavClick('audit-logs')} className={navItemClass('audit-logs')}>
                <History className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Audit Logs</span>
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Studio Branding Footer */}
        <div className="p-3.5 border-t border-slate-800 text-center text-xs text-slate-400 truncate">
          <span className="font-semibold text-slate-300">{settings?.studio_name || 'Studio'}</span>
          <span className="block text-[10px] text-slate-500 mt-0.5">Offline-First Studio PWA</span>
        </div>
      </aside>
    </>
  );
};
