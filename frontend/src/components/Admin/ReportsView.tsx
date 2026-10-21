import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  CheckCircle, 
  Layers, 
  DollarSign 
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReportsSummary()
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        Compiling business analytics and reports...
      </div>
    );
  }

  const { metrics, monthlyTrends, eventTypeBreakdown, topServices } = data;

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-pink-400" />
          <span>Studio Business Analytics</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Executive summary, revenue projections, and quotation conversion performance
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Quoted</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {formatCurrency(metrics.totalQuotationValue, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {metrics.totalQuotations} issued quotations
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Bookings</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatCurrency(metrics.acceptedValue, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.acceptedCount + metrics.convertedCount} accepted & converted quotes
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Client Base</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.totalClients}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active studio photography clients
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Events</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics.totalEvents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Registered photography shoots
          </div>
        </div>

      </div>

      {/* Monthly Trends Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Monthly Quotation Trend</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[460px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-center">Quotes Created</th>
                <th className="py-2.5 px-3 text-right">Total Quoted Value</th>
                <th className="py-2.5 px-3 text-right">Accepted / Booked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monthlyTrends.map((m: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    {m.month}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    {m.count}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200">
                    {formatCurrency(m.total_value, currencySymbol)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(m.accepted_value, currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Services */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Top-Demanded Studio Services</span>
          </h3>

          <div className="space-y-3">
            {topServices.map((svc: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white">{svc.name}</div>
                  <div className="text-[11px] text-slate-400">Included in {svc.count} quotations</div>
                </div>
                <div className="text-right font-mono font-bold text-sky-400">
                  {formatCurrency(svc.total_revenue, currencySymbol)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Type Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Event Types Distribution</span>
          </h3>

          <div className="space-y-3">
            {eventTypeBreakdown.map((evt: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-white">{evt.name}</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-400 border border-amber-800/40 font-mono font-bold">
                  {evt.count} event{evt.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
