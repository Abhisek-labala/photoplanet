import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar, type NavTab } from './components/Layout/Sidebar';
import { MobileBottomNav } from './components/Layout/MobileBottomNav';
import { LoginView } from './components/Auth/LoginView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { QuotationList } from './components/Quotation/QuotationList';
import { QuotationView } from './components/Quotation/QuotationView';
import { QuotationBuilder } from './components/Quotation/QuotationBuilder';
import { ClientList } from './components/Clients/ClientList';
import { EventList } from './components/Events/EventList';
import { ServiceMaster } from './components/Admin/ServiceMaster';
import { EventTypeMaster } from './components/Admin/EventTypeMaster';
import { UserManagement } from './components/Admin/UserManagement';
import { SettingsView } from './components/Admin/SettingsView';
import { ReportsView } from './components/Admin/ReportsView';
import { BackupView } from './components/Admin/BackupView';
import { AuditLogView } from './components/Admin/AuditLogView';
import type { Client } from './types';
import { WifiOff, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isCheckingAuth, isServerConnected, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Deep view states
  const [activeQuotationId, setActiveQuotationId] = useState<number | null>(null);
  const [editQuotationId, setEditQuotationId] = useState<number | null>(null);
  const [preselectedClient, setPreselectedClient] = useState<Client | null>(null);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Connecting to Studio Local Server...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Handlers for switching views
  const handleOpenQuotation = (id: number) => {
    setActiveQuotationId(id);
    setEditQuotationId(null);
  };

  const handleEditQuotation = (id: number) => {
    setEditQuotationId(id);
    setActiveQuotationId(null);
    setCurrentTab('create-quotation');
  };

  const handleCreateQuotation = (client?: Client) => {
    setActiveQuotationId(null);
    setEditQuotationId(null);
    setPreselectedClient(client || null);
    setCurrentTab('create-quotation');
  };

  const handleQuotationSaved = (id: number) => {
    setEditQuotationId(null);
    setActiveQuotationId(id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Local Server Connection Lost Banner (Requirement 6) */}
      {!isServerConnected && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-lg z-50 sticky top-0 no-print animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Connection to Studio Server Lost. Check Wi-Fi connection. Offline drafts will remain safe.</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        title={currentTab.toUpperCase().replace('-', ' ')}
      />

      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setActiveQuotationId(null);
            setEditQuotationId(null);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          
          {/* Active Quotation Detail / Print View */}
          {activeQuotationId ? (
            <QuotationView
              quotationId={activeQuotationId}
              onBack={() => setActiveQuotationId(null)}
              onEdit={(id) => handleEditQuotation(id)}
              onDuplicateSuccess={(newId) => handleOpenQuotation(newId)}
            />
          ) : currentTab === 'create-quotation' ? (
            <QuotationBuilder
              editQuotationId={editQuotationId}
              initialClient={preselectedClient}
              onSaved={handleQuotationSaved}
              onCancel={() => {
                setEditQuotationId(null);
                setCurrentTab('quotations');
              }}
            />
          ) : currentTab === 'quotations' ? (
            <QuotationList
              onOpenQuotation={handleOpenQuotation}
              onEditQuotation={handleEditQuotation}
              onCreateNew={() => handleCreateQuotation()}
            />
          ) : currentTab === 'clients' ? (
            <ClientList
              onCreateQuotationForClient={(c) => handleCreateQuotation(c)}
              onOpenQuotation={handleOpenQuotation}
            />
          ) : currentTab === 'events' ? (
            <EventList />
          ) : currentTab === 'services' && isAdmin ? (
            <ServiceMaster />
          ) : currentTab === 'event-types' && isAdmin ? (
            <EventTypeMaster />
          ) : currentTab === 'users' && isAdmin ? (
            <UserManagement />
          ) : currentTab === 'settings' && isAdmin ? (
            <SettingsView />
          ) : currentTab === 'reports' && isAdmin ? (
            <ReportsView />
          ) : currentTab === 'backup' && isAdmin ? (
            <BackupView />
          ) : currentTab === 'audit-logs' && isAdmin ? (
            <AuditLogView />
          ) : (
            <DashboardView
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenQuotation={handleOpenQuotation}
              onCreateQuotation={() => handleCreateQuotation()}
            />
          )}

        </main>
      </div>

      {/* Phone Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setActiveQuotationId(null);
          setEditQuotationId(null);
        }}
        onOpenMenu={() => setIsSidebarOpen(true)}
      />

    </div>
  );
};
