import React, { useState, useEffect, useMemo } from 'react';
import type { Client } from '../../types';
import { api } from '../../services/api';
import { ClientModal } from './ClientModal';
import { ClientDetailModal } from './ClientDetailModal';
import { DataTablePagination } from '../Common/DataTablePagination';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit, 
  Archive, 
  Eye, 
  PlusCircle,
  Calendar
} from 'lucide-react';

interface ClientListProps {
  onCreateQuotationForClient?: (client: Client) => void;
  onOpenQuotation?: (quotationId: number) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  onCreateQuotationForClient,
  onOpenQuotation
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailClientId, setDetailClientId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.getClients({ search });
      setClients(res.clients || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return clients.slice(startIndex, startIndex + pageSize);
  }, [clients, currentPage, pageSize]);

  const handleArchive = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Archive client "${client.name}"?`)) {
      try {
        await api.archiveClient(client.id);
        fetchClients();
      } catch (err: any) {
        alert(err.message || 'Failed to archive client');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Studio Clients</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage clients, contact profiles, event bookings & quotation history
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedClient(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/25 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name, mobile number, client code, or city..."
          className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors shadow-inner"
        />
      </div>

      {/* Clients List / Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading studio clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No clients found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? 'Try modifying your search query' : 'Create your first studio client to start quoting'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedClients.map(client => (
            <div
              key={client.id}
              onClick={() => setDetailClientId(client.id)}
              className="bg-slate-900/80 hover:bg-slate-800/60 border border-slate-800 rounded-3xl p-5 transition-all hover:border-slate-700 shadow-lg cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                      {client.client_code}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1 group-hover:text-sky-300 transition-colors">
                      {client.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Edit Client"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleArchive(client, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                      title="Archive Client"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono">{client.mobile}</span>
                    {client.alternate_mobile && (
                      <span className="text-slate-500 font-mono text-[11px]">
                        / {client.alternate_mobile}
                      </span>
                    )}
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{client.city}{client.state ? `, ${client.state}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{client.events_count || 0} Events</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-sky-400" />
                    <span>{client.quotations_count || 0} Quotes</span>
                  </span>
                </div>

                {onCreateQuotationForClient && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateQuotationForClient(client);
                    }}
                    className="p-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800/40 text-sky-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    title="Create Quotation for this Client"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Quote</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>

          <DataTablePagination
            currentPage={currentPage}
            totalItems={clients.length}
            pageSize={pageSize}
            pageSizeOptions={[6, 12, 24, 48, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="clients"
          />
        </div>
      )}

      {/* Add / Edit Client Modal */}
      <ClientModal
        client={selectedClient}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          fetchClients();
        }}
      />

      {/* Client Detail & History Modal */}
      <ClientDetailModal
        clientId={detailClientId}
        isOpen={!!detailClientId}
        onClose={() => setDetailClientId(null)}
        onOpenQuotation={(qId) => {
          setDetailClientId(null);
          if (onOpenQuotation) onOpenQuotation(qId);
        }}
        onCreateQuotationForClient={(cl) => {
          setDetailClientId(null);
          if (onCreateQuotationForClient) onCreateQuotationForClient(cl);
        }}
      />

    </div>
  );
};
