import React, { useState, useEffect } from 'react';
import type { Client, StudioEvent, Quotation } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  Plus, 
  ExternalLink,
  Clock
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

interface ClientDetailModalProps {
  clientId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQuotation: (quotationId: number) => void;
  onCreateQuotationForClient: (client: Client) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  clientId,
  isOpen,
  onClose,
  onOpenQuotation,
  onCreateQuotationForClient
}) => {
  const { settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [data, setData] = useState<{ client: Client; events: StudioEvent[]; quotations: Quotation[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId && isOpen) {
      setLoading(true);
      api.getClient(clientId)
        .then(res => setData(res))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [clientId, isOpen]);

  if (!isOpen || !clientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !data ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading client history...
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header Profile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-800/50 flex items-center justify-center text-sky-400 font-bold text-lg">
                  {data.client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{data.client.name}</span>
                    <span className="text-xs font-mono font-medium text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800/40">
                      {data.client.client_code}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {data.client.mobile}
                    </span>
                    {data.client.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {data.client.email}
                      </span>
                    )}
                    {data.client.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {data.client.city}, {data.client.state}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onCreateQuotationForClient(data.client);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/30 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>New Quotation</span>
              </button>
            </div>

            {/* Client Notes */}
            {data.client.notes && (
              <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs text-slate-300">
                <span className="text-slate-500 font-medium block mb-1">Preferences & Notes:</span>
                {data.client.notes}
              </div>
            )}

            {/* Quotations List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Quotations History ({data.quotations.length})</span>
                </h4>
              </div>

              {data.quotations.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500">
                  No quotations created for this client yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.quotations.map(q => (
                    <div
                      key={q.id}
                      onClick={() => {
                        onClose();
                        onOpenQuotation(q.id);
                      }}
                      className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm text-sky-400 group-hover:text-sky-300">
                            {q.quotation_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(q.status)}`}>
                            {q.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{formatDate(q.quotation_date)}</span>
                          <span>•</span>
                          <span>Created by {q.created_by_name || 'Staff'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-white font-mono">
                          {formatCurrency(q.grand_total, currencySymbol)}
                        </div>
                        <div className="text-[11px] text-sky-400 flex items-center justify-end gap-1 group-hover:underline">
                          <span>View Quotation</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Events List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Events Timeline ({data.events.length})</span>
                </h4>
              </div>

              {data.events.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500">
                  No events registered for this client yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.events.map(evt => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {evt.event_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                            {evt.event_type_name || 'Event'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {formatDate(evt.event_date)} • {evt.venue || 'Venue TBD'}, {evt.city || ''}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(evt.status)}`}>
                        {evt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
