import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import type { Quotation, Client, StudioEvent } from '../../types';
import { 
  FileText, 
  Calendar, 
  ArrowRight,
  FilePlus
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate?: (tab: any) => void;
  onOpenQuotation?: (id: number) => void;
  onCreateQuotation?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuotation,
  onCreateQuotation
}) => {
  const navigate = useNavigate();
  const { user, isAdmin, settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';
  const studioName = settings?.studio_name || 'Studio';

  const handleCreate = () => {
    if (onCreateQuotation) onCreateQuotation();
    else navigate('/quotations/new');
  };

  const handleOpen = (id: number) => {
    if (onOpenQuotation) onOpenQuotation(id);
    else navigate(`/quotations/${id}`);
  };

  const handleNav = (tab: string) => {
    if (onNavigate) onNavigate(tab);
    else if (tab === 'quotations') navigate('/quotations');
    else if (tab === 'events') navigate('/events');
    else navigate(`/${tab}`);
  };


  const [metrics, setMetrics] = useState<any>(null);
  const [recentQuotes, setRecentQuotes] = useState<Quotation[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<StudioEvent[]>([]);

  useEffect(() => {
    if (isAdmin) {
      api.getReportsSummary().then(res => {
        setMetrics(res.metrics);
        setUpcomingEvents(res.upcomingEvents || []);
      }).catch(console.error);
    }

    Promise.all([
      api.getQuotations(),
      api.getEvents({ upcoming: true })
    ]).then(([qRes, eRes]) => {
      setRecentQuotes((qRes.quotations || []).slice(0, 5));
      if (!isAdmin) {
        setUpcomingEvents((eRes.events || []).slice(0, 5));
      }
    });
  }, [isAdmin]);

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-widest block mb-1">
              {studioName}
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
              {isAdmin 
                ? 'Studio executive overview: quotations, bookings & upcoming shoot schedules.'
                : 'Create fast quotations, register client enquiries and track upcoming shoots.'}
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-sky-500/30 transition-all cursor-pointer self-start sm:self-auto shrink-0 min-h-[48px]"
          >
            <FilePlus className="w-5 h-5" />
            <span>Create New Quotation</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Row */}
      {isAdmin && metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Quotation Pipeline
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-white">
              {formatCurrency(metrics.totalQuotationValue, currencySymbol)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>{metrics.totalQuotations} total quotes</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Confirmed Value
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(metrics.acceptedValue, currencySymbol)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
              {metrics.acceptedCount + metrics.convertedCount} bookings secured
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Pending Drafts
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-amber-400">
              {metrics.draftCount}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
              Drafts in progress
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Active Clients
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono text-purple-400">
              {metrics.totalClients}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
              Registered clients
            </div>
          </div>

        </div>
      )}

      {/* Main 2-column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Recent Quotations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Recent Studio Quotations</span>
            </h3>
            <button
              onClick={() => handleNav('quotations')}
              className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 p-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentQuotes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No quotations created yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentQuotes.map(q => (
                <div
                  key={q.id}
                  onClick={() => handleOpen(q.id)}
                  className="p-3.5 bg-slate-950/80 hover:bg-slate-800/60 border border-slate-800 rounded-2xl flex items-center justify-between transition-colors cursor-pointer group active:scale-99"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-sky-400 group-hover:text-sky-300">
                        {q.quotation_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeClass(q.status)}`}>
                        {q.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 font-bold mt-1">
                      {q.client_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {formatDate(q.quotation_date)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-white">
                      {formatCurrency(q.grand_total, currencySymbol)}
                    </div>
                    <span className="text-[11px] text-sky-400 group-hover:underline font-semibold">
                      View
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events Schedule */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Upcoming Photography Events</span>
            </h3>
            <button
              onClick={() => handleNav('events')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 p-1 cursor-pointer"
            >
              <span>Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No upcoming shoots scheduled.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingEvents.map(evt => (
                <div
                  key={evt.id}
                  className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {evt.event_name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 font-semibold">
                        {evt.event_type_name || 'Event'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Client: {evt.client_name} • {evt.venue || 'Venue TBD'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-amber-300">
                      {formatDate(evt.event_date)}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadgeClass(evt.status)}`}>
                      {evt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
