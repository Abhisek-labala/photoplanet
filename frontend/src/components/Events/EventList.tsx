import React, { useState, useEffect, useMemo } from 'react';
import type { StudioEvent } from '../../types';
import { api } from '../../services/api';
import { EventModal } from './EventModal';
import { formatDate, getStatusBadgeClass } from '../../utils/formatters';
import { DataTablePagination } from '../Common/DataTablePagination';
import { 
  Calendar, 
  Search, 
  Plus, 
  MapPin, 
  User, 
  Edit, 
  Trash2, 
  Clock,
  Filter
} from 'lucide-react';

export const EventList: React.FC = () => {
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<StudioEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.getEvents({
        search,
        status: statusFilter || undefined,
        upcoming: upcomingOnly || undefined
      });
      setEvents(res.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchEvents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, upcomingOnly]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return events.slice(startIndex, startIndex + pageSize);
  }, [events, currentPage, pageSize]);

  const handleDelete = async (event: StudioEvent) => {
    if (confirm(`Delete event "${event.event_name}"?`)) {
      try {
        await api.deleteEvent(event.id);
        fetchEvents();
      } catch (err: any) {
        alert(err.message || 'Failed to delete event');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-amber-400" />
            <span>Studio Shoot & Event Schedule</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track photography dates, multi-event schedules, venues and coverage status
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedEvent(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, clients, venues or cities..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 [&>option]:bg-slate-900 [&>option]:text-slate-100 cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-100">All Statuses</option>
            <option value="Enquiry" className="bg-slate-900 text-slate-100">Enquiry</option>
            <option value="Quotation Sent" className="bg-slate-900 text-slate-100">Quotation Sent</option>
            <option value="Confirmed" className="bg-slate-900 text-slate-100">Confirmed</option>
            <option value="Completed" className="bg-slate-900 text-slate-100">Completed</option>
            <option value="Cancelled" className="bg-slate-900 text-slate-100">Cancelled</option>
          </select>

          <button
            onClick={() => setUpcomingOnly(!upcomingOnly)}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              upcomingOnly
                ? 'bg-amber-600 text-slate-950 border-amber-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {/* Event list */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No events found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search || statusFilter ? 'Try clearing your filters' : 'Add your first event schedule'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedEvents.map(event => (
              <div
                key={event.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                        {event.event_type_name || 'Event'}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5">
                        {event.event_name}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(event.status)}`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 my-3">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-white">{event.client_name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">({event.client_mobile})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-amber-300">
                        {formatDate(event.event_date)}
                        {event.end_date && event.end_date !== event.event_date ? ` to ${formatDate(event.end_date)}` : ''}
                      </span>
                    </div>

                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{event.venue}{event.city ? `, ${event.city}` : ''}</span>
                      </div>
                    )}

                    {event.requirements && (
                      <p className="text-[11px] text-slate-400 pt-1">
                        <strong className="text-slate-300">Crew / Services:</strong> {event.requirements}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(event)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

              </div>
            ))}
          </div>

          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={events.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Add / Edit Modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          fetchEvents();
        }}
      />

    </div>
  );
};
