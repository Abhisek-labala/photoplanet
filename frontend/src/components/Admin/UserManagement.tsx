import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '../../types';
import { api } from '../../services/api';
import { UserCheck, UserPlus, Shield, ShieldCheck, Camera, Lock, Edit2, Trash2, X, KeyRound } from 'lucide-react';
import { DataTablePagination } from '../Common/DataTablePagination';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'QUOTATION_STAFF'>('QUOTATION_STAFF');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return users.slice(startIndex, startIndex + pageSize);
  }, [users, currentPage, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name,
          mobile,
          role,
          password: password || undefined
        });
      } else {
        if (!username || !password) {
          alert('Username and password are required');
          return;
        }
        await api.createUser({
          name,
          username,
          mobile,
          password,
          role
        });
      }
      setShowModal(false);
      setEditingUser(null);
      setName('');
      setUsername('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.updateUser(u.id, { active: u.active === 1 ? 0 : 1 });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const handleReset2FA = async (u: User) => {
    const confirmed = window.confirm(
      `Are you sure you want to reset Google Authenticator for "${u.name}" (@${u.username})?\n\nThey will be able to sign in with their password only, and can set up Google Authenticator again when ready.`
    );
    if (!confirmed) return;

    try {
      const res = await api.resetUser2FA(u.id);
      alert(res.message || 'Google Authenticator reset successfully.');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to reset Google Authenticator.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-purple-400" />
            <span>Staff & Access Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage admin studio accounts and quotation staff logins. All roles enforced on the backend.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setName('');
            setUsername('');
            setMobile('');
            setPassword('');
            setRole('QUOTATION_STAFF');
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
          <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No users found</h3>
          <p className="text-xs text-slate-500 mt-1">Add your first studio staff member</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedUsers.map(u => (
              <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-2xl ${
                    u.role === 'ADMIN' ? 'bg-sky-950 text-sky-400 border border-sky-800/40' : 'bg-purple-950 text-purple-400 border border-purple-800/40'
                  }`}>
                    {u.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-sm">{u.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        u.role === 'ADMIN' ? 'bg-sky-950/60 text-sky-400 border-sky-800/50' : 'bg-purple-950/60 text-purple-400 border-purple-800/50'
                      }`}>
                        {u.role === 'ADMIN' ? 'Admin' : 'Quotation Staff'}
                      </span>

                      {/* 2FA Badge */}
                      {u.two_factor_enabled === 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          2FA ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full">
                          2FA OFF
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      Username: @{u.username}
                    </div>
                    {u.mobile && (
                      <div className="text-xs text-slate-500 font-mono">
                        Mobile: {u.mobile}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Reset 2FA button if enabled */}
                  {u.two_factor_enabled === 1 && (
                    <button
                      onClick={() => handleReset2FA(u)}
                      className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-900/50 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
                      title="Reset Google Authenticator (User lost device)"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border min-h-[38px] cursor-pointer ${
                      u.active === 1
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {u.active === 1 ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setName(u.name);
                      setUsername(u.username);
                      setMobile(u.mobile || '');
                      setPassword('');
                      setRole(u.role);
                      setShowModal(true);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
                    title="Edit / Reset Password"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <DataTablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={users.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingUser ? `Edit User (${editingUser.username})` : 'Create User Account'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Studio Manager"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-purple-500 min-h-[48px]"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-slate-300 font-medium text-xs mb-1.5">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ramesh_studio"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-purple-500 min-h-[48px]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 10-digit mobile"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">
                  {editingUser ? 'Reset Password (leave empty to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-purple-500 min-h-[48px]"
                  {...(!editingUser ? { required: true } : {})}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium text-xs mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none min-h-[48px]"
                >
                  <option value="QUOTATION_STAFF">Quotation Staff (Quotes, Clients, Events)</option>
                  <option value="ADMIN">Studio Admin (Full Access, Pricing, Reports, Backup)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs min-h-[48px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs min-h-[48px] cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
