import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar } from './components/Layout/Sidebar';
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
import { WifiOff } from 'lucide-react';

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isServerConnected } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="h-screen h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white overflow-hidden">
      
      {/* Local Server Connection Lost Banner */}
      {!isServerConnected && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-lg z-50 sticky top-0 shrink-0 no-print animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Connection to Studio Server Lost. Check Wi-Fi connection. Offline drafts will remain safe.</span>
        </div>
      )}

      {/* Main Navbar */}
      <div className="shrink-0 z-30">
        <Navbar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 h-full overflow-y-auto min-w-0 p-4 sm:p-6 lg:p-8 w-full pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Phone Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenMenu={() => setIsSidebarOpen(true)}
      />

    </div>
  );

};

export const App: React.FC = () => {
  const { isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Connecting to Studio Local Server...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginView />} />

      {/* Authenticated Application Routes with Persistent Layout */}
      <Route element={<ProtectedLayout />}>
        {/* Dashboard Home */}
        <Route path="/" element={<DashboardView />} />
        <Route path="/dashboard" element={<DashboardView />} />

        {/* Quotations Routes */}
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/new" element={<QuotationBuilder />} />
        <Route path="/quotations/:id" element={<QuotationView />} />
        <Route path="/quotations/:id/edit" element={<QuotationBuilder />} />

        {/* Clients & Events */}
        <Route path="/clients" element={<ClientList />} />
        <Route path="/events" element={<EventList />} />

        {/* Studio Admin Management Routes */}
        <Route path="/services" element={<AdminRoute><ServiceMaster /></AdminRoute>} />
        <Route path="/event-types" element={<AdminRoute><EventTypeMaster /></AdminRoute>} />
        <Route path="/reports" element={<AdminRoute><ReportsView /></AdminRoute>} />
        <Route path="/analytics" element={<AdminRoute><ReportsView /></AdminRoute>} />
        <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/staff" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><SettingsView /></AdminRoute>} />
        <Route path="/backup" element={<AdminRoute><BackupView /></AdminRoute>} />
        <Route path="/audit-logs" element={<AdminRoute><AuditLogView /></AdminRoute>} />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
