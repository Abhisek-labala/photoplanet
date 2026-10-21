import React, { useState, useEffect } from 'react';
import type { StudioEvent, Client, EventType } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, Calendar } from 'lucide-react';

interface EventModalProps {
  event?: StudioEvent | null;
  preselectedClient?: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (event: StudioEvent) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  preselectedClient,
  isOpen,
  onClose,
  onSaved
}) => {
  const { settings } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [clientId, setClientId] = useState<number | ''>('');
  const [eventTypeId, setEventTypeId] = useState<number | ''>('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [requirements, setRequirements] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<StudioEvent['status']>('Enquiry');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getClients().then(res => setClients(res.clients || []));
      api.getEventTypes().then(res => setEventTypes(res.eventTypes || []));

      if (event) {
        setClientId(event.client_id);
        setEventTypeId(event.event_type_id || '');
        setEventName(event.event_name);
        setEventDate(event.event_date);
        setEndDate(event.end_date || '');
        setVenue(event.venue || '');
        setCity(event.city || '');
        setRequirements(event.requirements || '');
        setSpecialInstructions(event.special_instructions || '');
        setNotes(event.notes || '');
        setStatus(event.status);
      } else {
        setClientId(preselectedClient ? preselectedClient.id : '');
        setEventTypeId('');
        setEventName('');
        setEventDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setVenue('');
        setCity(preselectedClient?.city || settings?.city || '');
        setRequirements('');
        setSpecialInstructions('');
        setNotes('');
        setStatus('Enquiry');
      }
      setError(null);
    }
  }, [isOpen, event, preselectedClient, settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!eventName.trim()) {
      setError('Event name is required.');
      return;
    }
    if (!eventDate) {
      setError('Event date is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      client_id: Number(clientId),
      event_type_id: eventTypeId ? Number(eventTypeId) : null,
      event_name: eventName.trim(),
      event_date: eventDate,
      end_date: endDate || null,
      venue: venue.trim() || null,
      city: city.trim() || null,
      requirements: requirements.trim() || null,
      special_instructions: specialInstructions.trim() || null,
      notes: notes.trim() || null,
      status
    };

    try {
      if (event) {
        const res = await api.updateEvent(event.id, payload);
        onSaved(res.event);
      } else {
        const res = await api.createEvent(payload);
        onSaved(res.event);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-0 sm:my-8 max-h-[92vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-800/40 text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {event ? 'Edit Event' : 'Add Studio Event'}
            </h3>
            <p className="text-xs text-slate-400">
              Coverage details, shoot dates and venue location
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client <span className="text-rose-400">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
                required
              >
                <option value="">Select a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Event Type
              </label>
              <select
                value={eventTypeId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setEventTypeId(val);
                  if (val && !eventName) {
                    const sel = eventTypes.find(t => t.id === val);
                    if (sel) setEventName(`${sel.name} Ceremony`);
                  }
                }}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
              >
                <option value="">Select event type...</option>
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Event Name / Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Wedding & Grand Reception"
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Venue / Hall</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue / Hall name"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Requirements / Crew</label>
            <input
              type="text"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g. 2 Candid Photos, 1 Traditional Video, 1 Drone"
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
              >
                <option value="Enquiry">Enquiry</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Special Instructions</label>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Stage lighting notes, bride entry"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-3 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors cursor-pointer min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm shadow-md shadow-amber-600/30 transition-colors cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {loading ? 'Saving...' : event ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
