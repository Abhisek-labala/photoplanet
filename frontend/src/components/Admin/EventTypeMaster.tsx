import React, { useState, useEffect, useMemo } from 'react';
import type { EventType } from '../../types';
import { api } from '../../services/api';
import { CalendarDays, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { DataTablePagination } from '../Common/DataTablePagination';

export const EventTypeMaster: React.FC = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingType, setEditingType] = useState<EventType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchEventTypes = async () => {
    setLoading(true);
    try {
      const res = await api.getEventTypes(true);
      setEventTypes(res.eventTypes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedEventTypes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return eventTypes.slice(startIndex, startIndex + pageSize);
  }, [eventTypes, currentPage, pageSize]);

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingType) {
        await api.updateEventType(editingType.id, {
          name: name.trim(),
          description: desc.trim() || null,
          sort_order: Number(sortOrder) || 0
        });
      } else {
        await api.createEventType({
          name: name.trim(),
          description: desc.trim() || null,
          sort_order: Number(sortOrder) || 0
        });
      }
      setEditingType(null);
      setShowAddModal(false);
      setName('');
      setDesc('');
      fetchEventTypes();
    } catch (err: any) {
      alert(err.message || 'Failed to save event type');
    }
  };

  const handleToggleActive = async (et: EventType) => {
    try {
      await api.updateEventType(et.id, { active: et.active === 1 ? 0 : 1 });
      fetchEventTypes();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete or deactivate this event type?')) {
      try {
        const res = await api.deleteEventType(id);
        alert(res.message);
        fetchEventTypes();
      } catch (err: any) {
        alert(err.message || 'Delete failed');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-teal-400" />
            <span>Event Types Master</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure event categories (Wedding, Muhurtham, Godumari, Pre-Wedding, etc.)
          </p>
        </div>

        <button
          onClick={() => {
            setEditingType(null);
            setName('');
            setDesc('');
            setSortOrder(eventTypes.length + 1);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event Type</span>
        </button>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading event types...
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No event types found</h3>
          <p className="text-xs text-slate-500 mt-1">Add your first event category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table for desktop / Tablet */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3 w-16 text-center">Order</th>
                    <th className="py-2.5 px-3">Event Type Name</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedEventTypes.map(et => (
                    <tr key={et.id} className={`hover:bg-slate-800/40 ${et.active === 0 ? 'opacity-40' : ''}`}>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {et.sort_order}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {et.name}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {et.description || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleActive(et)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
                            et.active === 1
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {et.active === 1 ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingType(et);
                            setName(et.name);
                            setDesc(et.description || '');
                            setSortOrder(et.sort_order);
                            setShowAddModal(true);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer inline-flex items-center justify-center min-w-[36px] min-h-[36px]"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(et.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer inline-flex items-center justify-center min-w-[36px] min-h-[36px]"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3">
            {paginatedEventTypes.map(et => (
              <div
                key={et.id}
                className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3 ${
                  et.active === 0 ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Order #{et.sort_order}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      {et.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleToggleActive(et)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border min-h-[36px] cursor-pointer ${
                      et.active === 1
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {et.active === 1 ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {et.description && (
                  <p className="text-xs text-slate-400">
                    {et.description}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingType(et);
                      setName(et.name);
                      setDesc(et.description || '');
                      setSortOrder(et.sort_order);
                      setShowAddModal(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(et.id)}
                    className="py-2 px-4 rounded-xl bg-slate-800/80 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={eventTypes.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingType ? 'Edit Event Type' : 'Add New Event Type'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Godumari, Muhurtham, Sangeet"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-teal-500 min-h-[48px]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">Description</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Traditional ceremony coverage"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-teal-500 min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white font-mono focus:outline-none min-h-[48px]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs min-h-[48px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs min-h-[48px] cursor-pointer shadow-lg shadow-teal-600/30"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
