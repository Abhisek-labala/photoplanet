import React, { useState, useEffect, useMemo } from 'react';
import type { Quotation } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import { DataTablePagination } from '../Common/DataTablePagination';
import { 
  FileText, 
  Search, 
  Plus, 
  Copy, 
  Edit3, 
  Eye, 
  Archive, 
  Calendar, 
  CalendarCheck,
  User 
} from 'lucide-react';

interface QuotationListProps {
  onOpenQuotation: (id: number) => void;
  onEditQuotation: (id: number) => void;
  onCreateNew: () => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  onOpenQuotation,
  onEditQuotation,
  onCreateNew
}) => {
  const { settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.getQuotations({
        search,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setQuotations(res.quotations || []);
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchQuotations();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, startDate, endDate]);

  const paginatedQuotations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return quotations.slice(startIndex, startIndex + pageSize);
  }, [quotations, currentPage, pageSize]);

  const handleDuplicate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Create a duplicate of this quotation?')) {
      try {
        const res = await api.duplicateQuotation(id);
        alert(res.message);
        onEditQuotation(res.quotationId);
      } catch (err: any) {
        alert(err.message || 'Duplicate failed');
      }
    }
  };

  const handleArchive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Archive this quotation?')) {
      try {
        await api.archiveQuotation(id);
        fetchQuotations();
      } catch (err: any) {
        alert(err.message || 'Archive failed');
      }
    }
  };

  const handleConvertToBooking = async (q: Quotation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Convert quotation "${q.quotation_number}" for ${q.client_name} to a Booking?\n\nThis will automatically schedule all its event details into Shoots & Events.`)) {
      try {
        const res = await api.convertToBooking(q.id);
        alert(res.message || 'Quotation converted to booking! Events added to Shoots & Events.');
        fetchQuotations();
      } catch (err: any) {
        alert(err.message || 'Failed to convert quotation to booking');
      }
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-400" />
            <span>Studio Quotations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, manage, duplicate, print and track status of client quotations
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition-all cursor-pointer min-h-[48px] self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quote no, client name, mobile or code..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px] [&>option]:bg-slate-900 [&>option]:text-slate-100 cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-100">All Statuses</option>
            <option value="Draft" className="bg-slate-900 text-slate-100">Draft</option>
            <option value="Sent" className="bg-slate-900 text-slate-100">Sent</option>
            <option value="Accepted" className="bg-slate-900 text-slate-100">Accepted</option>
            <option value="Converted to Booking" className="bg-slate-900 text-slate-100">Converted to Booking</option>
            <option value="Rejected" className="bg-slate-900 text-slate-100">Rejected</option>
            <option value="Cancelled" className="bg-slate-900 text-slate-100">Cancelled</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
            title="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
            title="End date"
          />
        </div>
      </div>

      {/* Quotations List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading quotations...
        </div>
      ) : quotations.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No quotations found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search || statusFilter ? 'Try modifying your filters' : 'Create your first quotation'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedQuotations.map(q => (
            <div
              key={q.id}
              onClick={() => onOpenQuotation(q.id)}
              className="bg-slate-900/80 hover:bg-slate-800/60 border border-slate-800 rounded-3xl p-4 sm:p-5 transition-all hover:border-slate-700 shadow-md cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 active:scale-99"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-base text-sky-400 group-hover:text-sky-300 transition-colors">
                    {q.quotation_number}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeClass(q.status)}`}>
                    {q.status}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {formatDate(q.quotation_date)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{q.client_name}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({q.client_mobile})
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    {q.events_count || 1} Event{(q.events_count || 1) > 1 ? 's' : ''} • {q.items_count || 1} Service{(q.items_count || 1) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Grand Total</span>
                  <span className="text-base sm:text-lg font-black font-mono text-white">
                    {formatCurrency(q.grand_total, currencySymbol)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQuotation(q.id);
                    }}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center"
                    title="View Quotation"
                  >
                    <Eye className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuotation(q.id);
                    }}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center"
                    title="Edit Quotation"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDuplicate(q.id, e)}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center"
                    title="Duplicate Quotation"
                  >
                    <Copy className="w-4 h-4 text-blue-400" />
                  </button>

                  <button
                    onClick={(e) => handleArchive(q.id, e)}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  {q.status !== 'Converted to Booking' && (
                    <button
                      onClick={(e) => handleConvertToBooking(q, e)}
                      className="p-2.5 rounded-2xl bg-slate-800 hover:bg-indigo-950 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center"
                      title="Convert to Booking & schedule in Shoots & Events"
                    >
                      <CalendarCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}

          {/* DataTable Pagination */}
          <DataTablePagination
            currentPage={currentPage}
            totalItems={quotations.length}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="quotations"
          />
        </div>
      )}

    </div>
  );
};
