import React, { useState, useEffect, useMemo } from 'react';
import type { AuditLog } from '../../types';
import { api } from '../../services/api';
import { History, Search, Shield } from 'lucide-react';
import { DataTablePagination } from '../Common/DataTablePagination';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ search, limit: 500 });
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return logs.slice(startIndex, startIndex + pageSize);
  }, [logs, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
          <History className="w-6 h-6 text-slate-400" />
          <span>System Audit Trail & Security Logs</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Immutable audit record of all client edits, master price modifications, quotation issues and user logins
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit logs by action, username, or quotation ID..."
          className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No audit logs found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? 'Try clearing your search query' : 'System events and actions will be logged here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Entity ID</th>
                    <th className="py-2.5 px-3">Details / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {paginatedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-sky-400">
                        @{log.username}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 uppercase">
                        {log.entity}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {log.entity_id || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs font-sans">
                        {log.new_value || log.old_value || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={logs.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

    </div>
  );
};

