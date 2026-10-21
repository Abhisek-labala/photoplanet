import React, { useState, useEffect, useMemo } from 'react';
import type { ServiceCategory, Service } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { DataTablePagination } from '../Common/DataTablePagination';
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2,
  X,
  Search
} from 'lucide-react';

interface CategoryServiceCardProps {
  category: ServiceCategory;
  currencySymbol: string;
  onStartCreate: (catId: number) => void;
  onStartEdit: (svc: Service) => void;
  onToggleActive: (svc: Service) => void;
  onDeleteService: (svc: Service) => void;
  onDeleteCategory: (category: ServiceCategory) => void;
}

const CategoryServiceCard: React.FC<CategoryServiceCardProps> = ({
  category,
  currencySymbol,
  onStartCreate,
  onStartEdit,
  onToggleActive,
  onDeleteService,
  onDeleteCategory
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const services = category.services || [];
  const totalServices = services.length;

  useEffect(() => {
    if (currentPage > 1 && (currentPage - 1) * pageSize >= totalServices) {
      setCurrentPage(1);
    }
  }, [totalServices, pageSize, currentPage]);

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return services.slice(start, start + pageSize);
  }, [services, currentPage, pageSize]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wider">
            {category.name}
          </h3>
          <span className="text-[11px] text-slate-500">
            ({totalServices} services)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartCreate(category.id)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service</span>
          </button>

          <button
            onClick={() => onDeleteCategory(category)}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer min-w-[38px] min-h-[38px] inline-flex items-center justify-center"
            title="Delete Category"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {totalServices === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No services in this category yet. Click "+ Add Service" above to create one.
        </div>
      ) : (
        <>
          {/* Responsive Table with horizontal scroll on small devices */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Service Name</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Master Price</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedServices.map(svc => (
                  <tr key={svc.id} className={`hover:bg-slate-800/40 ${svc.active === 0 ? 'opacity-40' : ''}`}>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs sm:text-sm">{svc.name}</div>
                      {svc.description && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{svc.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {svc.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(svc.price, currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleActive(svc)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${
                          svc.active === 1
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {svc.active === 1 ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onStartEdit(svc)}
                          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                          title="Edit Master Price"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteService(svc)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub-service Pagination */}
          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalServices}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemName="services"
            className="bg-slate-950/60 border-slate-800/60 rounded-2xl p-2.5 sm:p-3 mt-2"
          />
        </>
      )}

    </div>
  );
};

export const ServiceMaster: React.FC = () => {
  const { settings } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [search, setSearch] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newServiceCategoryId, setNewServiceCategoryId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  // Form fields
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceUnit, setServiceUnit] = useState('Event');
  const [servicePrice, setServicePrice] = useState<number>(0);

  // New Category input
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fetchServices = async () => {
    try {
      const res = await api.getServices(true);
      setCategories(res.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.map(cat => {
      const matchesCat = cat.name.toLowerCase().includes(q);
      const filteredServices = (cat.services || []).filter(s => 
        s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
      );
      if (matchesCat) return cat;
      if (filteredServices.length > 0) return { ...cat, services: filteredServices };
      return null;
    }).filter(Boolean) as ServiceCategory[];
  }, [categories, search]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCategories.slice(startIndex, startIndex + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    try {
      if (editingService) {
        await api.updateService(editingService.id, {
          name: serviceName.trim(),
          description: serviceDesc.trim() || null,
          unit: serviceUnit,
          price: Number(servicePrice)
        });
      } else if (newServiceCategoryId) {
        await api.createService({
          category_id: newServiceCategoryId,
          name: serviceName.trim(),
          description: serviceDesc.trim() || null,
          unit: serviceUnit,
          price: Number(servicePrice)
        });
      }
      setEditingService(null);
      setNewServiceCategoryId(null);
      setServiceName('');
      setServiceDesc('');
      setServicePrice(0);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    }
  };

  const handleToggleServiceActive = async (svc: Service) => {
    try {
      await api.updateService(svc.id, { active: svc.active ? 0 : 1 });
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to update service status');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({ name: newCatName.trim().toUpperCase() });
      setNewCatName('');
      setShowNewCatInput(false);
      fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleStartEdit = (svc: Service) => {
    setEditingService(svc);
    setNewServiceCategoryId(null);
    setServiceName(svc.name);
    setServiceDesc(svc.description || '');
    setServiceUnit(svc.unit);
    setServicePrice(svc.price);
  };

  const handleStartCreate = (catId: number) => {
    setNewServiceCategoryId(catId);
    setEditingService(null);
    setServiceName('');
    setServiceDesc('');
    setServiceUnit('Event');
    setServicePrice(0);
  };

  const handleDeleteService = async (svc: Service) => {
    if (confirm(`Delete service "${svc.name}"?\n\nIf this service is referenced in existing quotations, it will be safely deactivated instead of deleted.`)) {
      try {
        const res = await api.deleteService(svc.id);
        if (res.message) {
          alert(res.message);
        }
        fetchServices();
      } catch (err: any) {
        alert(err.message || 'Failed to delete service');
      }
    }
  };

  const handleDeleteCategory = async (cat: ServiceCategory) => {
    if (confirm(`Delete category "${cat.name}"?\n\nIf it contains active services, it will be deactivated instead of deleted.`)) {
      try {
        const res = await api.deleteCategory(cat.id);
        if (res.message) {
          alert(res.message);
        }
        fetchServices();
      } catch (err: any) {
        alert(err.message || 'Failed to delete category');
      }
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Service & Price Master</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Admin master pricing repository. Changes here do NOT overwrite existing saved quotation snapshots.
          </p>
        </div>

        <button
          onClick={() => setShowNewCatInput(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {showNewCatInput && (
        <div className="p-4 bg-slate-900 border border-indigo-700/60 rounded-3xl flex items-center gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name (e.g. POST-PROCESSING)"
            className="flex-1 px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-xs text-white uppercase focus:outline-none focus:border-indigo-500 min-h-[48px]"
          />
          <button
            onClick={handleCreateCategory}
            className="px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs min-h-[48px] cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => setShowNewCatInput(false)}
            className="p-2.5 text-slate-400 hover:text-white cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search service by name, deliverable, or category..."
          className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
        />
      </div>

      {/* Categories & Service Cards */}
      {filteredCategories.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No services found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? 'Try a different search keyword' : 'Create your first service category above'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-6">
            {paginatedCategories.map(cat => (
              <CategoryServiceCard
                key={cat.id}
                category={cat}
                currencySymbol={currencySymbol}
                onStartCreate={handleStartCreate}
                onStartEdit={handleStartEdit}
                onToggleActive={handleToggleServiceActive}
                onDeleteService={handleDeleteService}
                onDeleteCategory={handleDeleteCategory}
              />
            ))}
          </div>

          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredCategories.length}
            pageSizeOptions={[2, 4, 8, 16]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemName="categories"
          />
        </div>
      )}

      {/* Edit / Create Service Modal */}
      {(editingService || newServiceCategoryId !== null) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-0 sm:my-8 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditingService(null);
                setNewServiceCategoryId(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingService ? 'Edit Master Service & Price' : 'Add New Master Service'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Service Name *</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Candid Photography"
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[48px]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Description / Deliverables</label>
                <input
                  type="text"
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="e.g. Artistic prime lens candid coverage"
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Unit</label>
                  <select
                    value={serviceUnit}
                    onChange={(e) => setServiceUnit(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none min-h-[48px]"
                  >
                    <option value="Event">Event</option>
                    <option value="Day">Day</option>
                    <option value="Hour">Hour</option>
                    <option value="Camera">Camera</option>
                    <option value="Session">Session</option>
                    <option value="Album">Album</option>
                    <option value="Sheet">Sheet</option>
                    <option value="Video">Video</option>
                    <option value="Package">Package</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Master Price ({currencySymbol}) *</label>
                  <input
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(Number(e.target.value))}
                    min="0"
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-indigo-500 min-h-[48px]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(null);
                    setNewServiceCategoryId(null);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-sm min-h-[48px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm min-h-[48px] cursor-pointer"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
