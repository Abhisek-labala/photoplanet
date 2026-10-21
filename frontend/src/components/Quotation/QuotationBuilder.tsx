import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import type {
  Client,
  ServiceCategory,
  Service,
  EventType,
  QuotationEvent,
  QuotationItem
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { ClientModal } from '../Clients/ClientModal';
import {
  Plus,
  Trash2,
  Search,
  Check,
  Save,
  FileText,
  UserPlus,
  Layers,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';

interface QuotationBuilderProps {
  editQuotationId?: number | null;
  initialClient?: Client | null;
  onSaved?: (quotationId: number) => void;
  onCancel?: () => void;
}

const AUTOSAVE_KEY = 'studio_gfx_quotation_draft';

export const QuotationBuilder: React.FC<QuotationBuilderProps> = ({
  editQuotationId: propEditQuotationId,
  initialClient,
  onSaved,
  onCancel
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const editQuotationId = propEditQuotationId ?? (paramId ? Number(paramId) : null);
  const locationClient = (location.state as any)?.client as Client | undefined;
  const initialClientResolved = initialClient || locationClient || null;

  const handleSavedAction = (savedId: number) => {
    if (onSaved) onSaved(savedId);
    else navigate(`/quotations/${savedId}`);
  };

  const handleCancelAction = () => {
    if (onCancel) onCancel();
    else navigate('/quotations');
  };

  const { settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClientResolved);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);

  // Multi-event structure
  const [events, setEvents] = useState<QuotationEvent[]>([
    {
      event_date: new Date().toISOString().split('T')[0],
      event_type: 'Wedding',
      venue: '',
      requirements: '',
      items: []
    }
  ]);

  // Pricing & Discounts
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [taxPercentage, setTaxPercentage] = useState<number>(18);
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('');

  // Payment Schedule
  const [paymentMilestones, setPaymentMilestones] = useState<{ milestone: string; percentage: number }[]>([]);

  // Service picker modal
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDraftPrompt, setHasDraftPrompt] = useState(false);

  // Load master data
  useEffect(() => {
    Promise.all([
      api.getClients(),
      api.getServices(),
      api.getEventTypes(),
      api.getSettings()
    ]).then(([clientsRes, servicesRes, eventTypesRes, settingsRes]) => {
      const loadedClients = clientsRes.clients || [];
      setClients(loadedClients);
      setCategories(servicesRes.categories || []);
      const loadedEventTypes = eventTypesRes.eventTypes || [];
      setEventTypes(loadedEventTypes);

      // Preselect client from query param if provided (?clientId=123)
      const urlClientId = searchParams.get('clientId');
      if (!selectedClient && urlClientId && loadedClients.length > 0) {
        const matched = loadedClients.find((c: Client) => String(c.id) === urlClientId);
        if (matched) {
          setSelectedClient(matched);
        }
      }


      const st = settingsRes.settings || settings;
      if (st) {
        setTerms(st.default_terms || '');
        setTaxEnabled(st.tax_enabled === 1);
        setTaxPercentage(st.tax_percentage !== undefined ? Number(st.tax_percentage) : 18);

        if (st.default_payment_schedule && Array.isArray(st.default_payment_schedule)) {
          setPaymentMilestones(st.default_payment_schedule);
        } else {
          setPaymentMilestones([
            { milestone: 'Booking Token', percentage: 20 },
            { milestone: 'Advance Before Shoot', percentage: 30 },
            { milestone: 'Event Day Completion', percentage: 30 },
            { milestone: 'After Editing Approval', percentage: 10 },
            { milestone: 'Final Album Delivery', percentage: 10 }
          ]);
        }

        // Set default event type dynamically if new
        if (!editQuotationId && loadedEventTypes.length > 0) {
          setEvents(prev => prev.map(e => ({ ...e, event_type: loadedEventTypes[0].name })));
        }
      }
    }).catch(err => console.error(err));

    // Check autosave draft if not editing existing quotation
    if (!editQuotationId) {
      const savedDraft = localStorage.getItem(AUTOSAVE_KEY);
      if (savedDraft) {
        setHasDraftPrompt(true);
      }
    } else {
      // Load existing quotation for edit
      api.getQuotation(editQuotationId).then(res => {
        const q = res.quotation;
        setSelectedClient({
          id: q.client_id,
          name: q.client_name,
          mobile: q.client_mobile,
          client_code: q.client_code,
          archived: 0,
          created_at: q.created_at
        });
        setQuotationDate(q.quotation_date);
        setDiscountType(q.discount_type);
        setDiscountValue(q.discount_value);
        setAdditionalCharges(q.additional_charges);
        setTaxEnabled(q.tax_enabled === 1);
        setTaxPercentage(q.tax_percentage);
        setNotes(q.notes || '');
        setTerms(q.terms || '');
        if (res.events && res.events.length > 0) {
          setEvents(res.events);
        }
        if (res.paymentTerms && res.paymentTerms.length > 0) {
          setPaymentMilestones(res.paymentTerms.map((pt: any) => ({
            milestone: pt.milestone,
            percentage: pt.percentage
          })));
        }
      });
    }
  }, [editQuotationId]);

  // Restore draft
  const handleRestoreDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || '{}');
      if (draft.selectedClient) setSelectedClient(draft.selectedClient);
      if (draft.events) setEvents(draft.events);
      if (draft.discountType) setDiscountType(draft.discountType);
      if (draft.discountValue !== undefined) setDiscountValue(draft.discountValue);
      if (draft.additionalCharges !== undefined) setAdditionalCharges(draft.additionalCharges);
      if (draft.taxEnabled !== undefined) setTaxEnabled(draft.taxEnabled);
      if (draft.notes) setNotes(draft.notes);
      setHasDraftPrompt(false);
    } catch {
      localStorage.removeItem(AUTOSAVE_KEY);
      setHasDraftPrompt(false);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setHasDraftPrompt(false);
  };

  // Autosave to localStorage on changes (debounced)
  useEffect(() => {
    if (!editQuotationId) {
      const timer = setTimeout(() => {
        const draft = {
          selectedClient,
          events,
          discountType,
          discountValue,
          additionalCharges,
          taxEnabled,
          notes
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedClient, events, discountType, discountValue, additionalCharges, taxEnabled, notes, editQuotationId]);

  // Event handlers for adding/removing events
  const addEvent = () => {
    const defaultTypeName = eventTypes.length > 0 ? eventTypes[0].name : 'Event';
    setEvents([
      ...events,
      {
        event_date: quotationDate,
        event_type: defaultTypeName,
        venue: '',
        requirements: '',
        items: []
      }
    ]);
  };

  const removeEvent = (index: number) => {
    if (events.length <= 1) {
      alert('Quotation must contain at least one event.');
      return;
    }
    setEvents(events.filter((_, idx) => idx !== index));
  };

  const updateEventField = (index: number, field: keyof QuotationEvent, val: any) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: val };
    setEvents(updated);
  };

  // Service item management inside event
  const addItemToEvent = (eventIndex: number, service: Service) => {
    const updated = [...events];
    const targetEvent = updated[eventIndex];
    if (!targetEvent) return;

    const existingIdx = targetEvent.items.findIndex(it => it.service_id === service.id);
    if (existingIdx >= 0) {
      // Already selected
      return;
    } else {
      targetEvent.items.push({
        service_id: service.id,
        service_name_snapshot: service.name,
        description_snapshot: service.description,
        quantity: 1,
        unit: service.unit,
        unit_price: service.price,
        discount: 0,
        total: service.price
      });
    }
    setEvents(updated);
  };

  const removeServiceFromEvent = (eventIndex: number, serviceId: number) => {
    const updated = [...events];
    const targetEvent = updated[eventIndex];
    if (!targetEvent) return;
    targetEvent.items = targetEvent.items.filter(it => it.service_id !== serviceId);
    setEvents(updated);
  };

  const toggleServiceInEvent = (eventIndex: number, service: Service) => {
    const targetEvent = events[eventIndex];
    if (!targetEvent) return;
    const isSelected = targetEvent.items.some(it => it.service_id === service.id);
    if (isSelected) {
      removeServiceFromEvent(eventIndex, service.id);
    } else {
      addItemToEvent(eventIndex, service);
    }
  };

  const updateItem = (eventIndex: number, itemIndex: number, updates: Partial<QuotationItem>) => {
    const updated = [...events];
    const it = { ...updated[eventIndex].items[itemIndex], ...updates };
    const qty = Math.max(0.5, Number(it.quantity) || 1);
    const price = Math.max(0, Number(it.unit_price) || 0);
    const disc = Math.max(0, Number(it.discount) || 0);
    it.quantity = qty;
    it.unit_price = price;
    it.discount = disc;
    it.total = Math.round(Math.max(0, (qty * price) - disc) * 100) / 100;
    updated[eventIndex].items[itemIndex] = it;
    setEvents(updated);
  };

  const removeItem = (eventIndex: number, itemIndex: number) => {
    const updated = [...events];
    updated[eventIndex].items = updated[eventIndex].items.filter((_, idx) => idx !== itemIndex);
    setEvents(updated);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    events.forEach(e => {
      e.items.forEach(it => {
        subtotal += it.total;
      });
    });
    subtotal = Math.round(subtotal * 100) / 100;

    let discountAmt = 0;
    if (discountType === 'percentage') {
      discountAmt = Math.round(((subtotal * (Number(discountValue) || 0)) / 100) * 100) / 100;
    } else {
      discountAmt = Math.round((Number(discountValue) || 0) * 100) / 100;
    }
    discountAmt = Math.min(discountAmt, subtotal);

    const extra = Math.round((Number(additionalCharges) || 0) * 100) / 100;
    const taxableAmount = Math.max(0, subtotal - discountAmt + extra);

    let taxAmt = 0;
    if (taxEnabled) {
      taxAmt = Math.round(((taxableAmount * (Number(taxPercentage) || 0)) / 100) * 100) / 100;
    }

    const grandTotal = Math.round((taxableAmount + taxAmt) * 100) / 100;

    return { subtotal, discountAmt, extra, taxAmt, grandTotal };
  };

  const totals = calculateTotals();

  // Save Quotation
  const handleSave = async () => {
    if (!selectedClient) {
      setError('Please select or create a client first.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const totalItems = events.reduce((acc, evt) => acc + evt.items.length, 0);
    if (totalItems === 0) {
      setError('Please add at least one service item to the quotation.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      client_id: selectedClient.id,
      quotation_date: quotationDate,
      valid_until: null,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      additional_charges: Number(additionalCharges) || 0,
      tax_enabled: taxEnabled ? 1 : 0,
      tax_percentage: Number(taxPercentage) || 18,
      notes,
      terms,
      events,
      payment_terms: paymentMilestones
    };

    try {
      if (editQuotationId) {
        await api.updateQuotation(editQuotationId, payload);
        localStorage.removeItem(AUTOSAVE_KEY);
        handleSavedAction(editQuotationId);
      } else {
        const res = await api.createQuotation(payload);
        localStorage.removeItem(AUTOSAVE_KEY);
        handleSavedAction(res.quotationId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save quotation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Filter services
  const filteredServices = categories
    .filter(cat => activeCategoryFilter === 'ALL' || cat.name === activeCategoryFilter)
    .flatMap(cat => (cat.services || []).map(s => ({ ...s, categoryName: cat.name })))
    .filter(s => {
      if (!serviceSearch.trim()) return true;
      return (
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()))
      );
    });

  return (
    <div className="space-y-6 pb-28 lg:pb-12">

      {/* Autosave Draft Notification Banner */}
      {hasDraftPrompt && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-700/60 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You have an unfinished quotation draft saved locally.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreDraft}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-colors cursor-pointer min-h-[40px]"
            >
              Resume Draft
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer min-h-[40px]"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-400" />
            <span>{editQuotationId ? 'Edit Quotation' : 'Create Quotation'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Build photography & cinematography packages with multi-event coverage
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleCancelAction}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save & View'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CLIENT SELECTION & DATES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-xs font-mono border border-sky-800/60">
              1
            </span>
            <span>Client & Quotation Dates</span>
          </div>

          <button
            type="button"
            onClick={() => setIsClientModalOpen(true)}
            className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5 p-1 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ New Client</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Client <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedClient ? selectedClient.id : ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                const found = clients.find(c => c.id === id);
                setSelectedClient(found || null);
              }}
              style={{ colorScheme: 'dark' }}
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px] [&>option]:bg-slate-900 [&>option]:text-slate-100 cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-100">Choose client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Quotation Date
            </label>
            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
            />
          </div>
        </div>

        {selectedClient && (
          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center font-bold">
                {selectedClient.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{selectedClient.name}</span>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-1.5 rounded border border-sky-800/40">
                    {selectedClient.client_code}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Ph: {selectedClient.mobile} {selectedClient.city ? `• ${selectedClient.city}` : ''}
                </div>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">✓ Client Selected</span>
          </div>
        )}
      </div>

      {/* STEP 2: MULTI-EVENT SERVICES BUILDER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-xs font-mono border border-sky-800/60">
              2
            </span>
            <span>Events & Services ({events.length} Event{events.length > 1 ? 's' : ''})</span>
          </div>

          <button
            type="button"
            onClick={addEvent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold border border-slate-700 transition-colors cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Event Date</span>
          </button>
        </div>

        {events.map((evt, eventIdx) => (
          <div
            key={eventIdx}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4"
          >
            {/* Event Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-xl bg-sky-950 text-sky-400 border border-sky-800/50 text-xs font-bold font-mono">
                  EVENT {eventIdx + 1}
                </span>

                <select
                  value={evt.event_type}
                  onChange={(e) => updateEventField(eventIdx, 'event_type', e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-sky-500 min-h-[40px]"
                >
                  {eventTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  <option value="Custom Event">Custom Event</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={evt.event_date}
                  onChange={(e) => updateEventField(eventIdx, 'event_date', e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 min-h-[40px]"
                />

                <input
                  type="text"
                  value={evt.venue || ''}
                  onChange={(e) => updateEventField(eventIdx, 'venue', e.target.value)}
                  placeholder="Venue (e.g. Taj Krishna)"
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1 sm:w-48 min-h-[40px]"
                />

                {events.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEvent(eventIdx)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="Remove Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Service Items for this Event */}
            <div className="space-y-2">
              {evt.items.length === 0 ? (
                <div className="py-6 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-xs text-slate-500">
                  No services added to this event yet. Tap "+ Add Services" below.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {evt.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">
                          {item.service_name_snapshot}
                        </div>
                        {item.description_snapshot && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.description_snapshot}
                          </div>
                        )}
                        <span className="text-[10px] text-sky-400 font-semibold">
                          Unit: {item.unit}
                        </span>
                      </div>

                      {/* Stepper & Pricing Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateItem(eventIdx, itemIdx, { quantity: Math.max(1, item.quantity - 1) })}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer active:scale-95 text-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(eventIdx, itemIdx, { quantity: Number(e.target.value) })}
                            className="w-12 text-center bg-transparent text-white font-mono font-bold text-sm focus:outline-none"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(eventIdx, itemIdx, { quantity: item.quantity + 1 })}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer active:scale-95 text-sm"
                          >
                            +
                          </button>
                        </div>

                        {/* Rate */}
                        <div className="w-24">
                          <span className="text-[10px] text-slate-500 block">Rate</span>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(eventIdx, itemIdx, { unit_price: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white text-right focus:outline-none"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="text-right w-24">
                          <span className="text-[10px] text-slate-500 block">Total</span>
                          <div className="font-mono font-bold text-white text-sm">
                            {formatCurrency(item.total, currencySymbol)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(eventIdx, itemIdx)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* Add Services to Event Trigger */}
              <button
                type="button"
                onClick={() => {
                  setActiveEventIndex(eventIdx);
                  setServiceSearch('');
                }}
                className="w-full py-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 text-sky-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer mt-3 min-h-[46px]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Select Services for {evt.event_type}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* STEP 3: DISCOUNTS, TAX & CHARGES */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-slate-800">
          <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-xs font-mono border border-sky-800/60">
            3
          </span>
          <span>Discounts, Tax & Additional Charges</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Discount
            </label>
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-24 px-2.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none min-h-[48px]"
              >
                <option value="percentage">% Pct</option>
                <option value="fixed">{currencySymbol} Fixed</option>
              </select>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder="0"
                min="0"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm font-mono text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Travel / Extra Charges ({currencySymbol})
            </label>
            <input
              type="number"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(Number(e.target.value))}
              placeholder="0"
              min="0"
              className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm font-mono text-white focus:outline-none focus:border-sky-500 min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tax Settings
            </label>
            <div className="flex items-center gap-3 py-2 min-h-[48px]">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  className="w-5 h-5 rounded text-sky-500 focus:ring-0 cursor-pointer"
                />
                <span>Enable Tax ({taxPercentage}%)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Calculation summary cards */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div>Subtotal: <strong className="text-white font-mono">{formatCurrency(totals.subtotal, currencySymbol)}</strong></div>
            {totals.discountAmt > 0 && (
              <div className="text-emerald-400">Discount: -{formatCurrency(totals.discountAmt, currencySymbol)}</div>
            )}
            {totals.extra > 0 && (
              <div>Charges: +{formatCurrency(totals.extra, currencySymbol)}</div>
            )}
            {totals.taxAmt > 0 && (
              <div>Tax ({taxPercentage}%): +{formatCurrency(totals.taxAmt, currencySymbol)}</div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">Grand Total</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-sky-400">
              {formatCurrency(totals.grandTotal, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 4: PAYMENT SCHEDULE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-slate-800">
          <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-xs font-mono border border-sky-800/60">
            4
          </span>
          <span>Payment Milestones Schedule</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {paymentMilestones.map((pt, idx) => {
            const milestoneAmount = Math.round((totals.grandTotal * pt.percentage) / 100);
            return (
              <div key={idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <input
                  type="text"
                  value={pt.milestone}
                  onChange={(e) => {
                    const updated = [...paymentMilestones];
                    updated[idx].milestone = e.target.value;
                    setPaymentMilestones(updated);
                  }}
                  className="w-full bg-transparent text-xs font-bold text-slate-300 focus:outline-none"
                />
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={pt.percentage}
                      onChange={(e) => {
                        const updated = [...paymentMilestones];
                        updated[idx].percentage = Number(e.target.value);
                        setPaymentMilestones(updated);
                      }}
                      className="w-12 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-xs text-sky-400 font-mono text-center focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500">%</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-white">
                    {formatCurrency(milestoneAmount, currencySymbol)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 5: NOTES & TERMS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white pb-3 border-b border-slate-800">
          <span className="w-6 h-6 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center text-xs font-mono border border-sky-800/60">
            5
          </span>
          <span>Terms & Special Notes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Quotation Notes / Client Customizations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP client coverage, includes 1 complimentary teaser reel."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Terms & Conditions (Pre-filled from Studio Settings)
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* SERVICE SELECTION MODAL (TOUCH & MOBILE FRIENDLY) */}
      {activeEventIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-0 sm:my-8 max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-400" />
                  <span>Select Services for {events[activeEventIndex]?.event_type}</span>
                </h3>
                <p className="text-xs text-slate-400">Tap to add or remove services from this event</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveEventIndex(null)}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold min-h-[40px] cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[38px] ${activeCategoryFilter === 'ALL'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[38px] ${activeCategoryFilter === cat.name
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search services (e.g. Candid, Drone, Album)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>

            {/* Services Grid */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {filteredServices.map(svc => {
                const isSelected = events[activeEventIndex]?.items.some(it => it.service_id === svc.id);
                return (
                  <div
                    key={svc.id}
                    onClick={() => toggleServiceInEvent(activeEventIndex, svc)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-99 ${isSelected
                      ? 'bg-sky-950/40 border-sky-500/60 shadow-[0_0_15px_rgba(2,132,199,0.12)]'
                      : 'bg-slate-950 hover:bg-slate-800/60 border-slate-800'
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{svc.name}</span>
                        <span className="text-[10px] text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800/40 font-semibold">
                          {svc.categoryName}
                        </span>
                      </div>
                      {svc.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{svc.description}</p>
                      )}
                      <span className="text-[10px] text-slate-500">Unit: {svc.unit}</span>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono text-white">
                          {formatCurrency(svc.price, currencySymbol)}
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeServiceFromEvent(activeEventIndex, svc.id);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/60 flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Remove service from this event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {/* <span className="hidden xs:inline sm:inline">Remove</span> */}
                          </button>

                          <div
                            className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30"
                            title="Service added"
                          >
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-sky-500 text-slate-400 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                          title="Add service to event"
                        >
                          <Plus className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* New Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSaved={(newClient) => {
          setClients([newClient, ...clients]);
          setSelectedClient(newClient);
          setIsClientModalOpen(false);
        }}
      />

      {/* MOBILE STICKY BOTTOM BAR (REQUIREMENT 4 & 44) */}
      <div className="lg:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-20 bg-slate-950/98 backdrop-blur-md border-t border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total Amount</span>
          <span className="text-lg font-black font-mono text-sky-400">
            {formatCurrency(totals.grandTotal, currencySymbol)}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-sky-500/30 flex items-center gap-2 cursor-pointer active:scale-95 min-h-[46px]"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save Quote'}</span>
        </button>
      </div>

    </div>
  );
};
