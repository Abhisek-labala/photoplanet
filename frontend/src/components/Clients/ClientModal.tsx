import React, { useState, useEffect } from 'react';
import type { Client } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, AlertTriangle, User, Phone, Mail, MapPin } from 'lucide-react';

interface ClientModalProps {
  client?: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (client: Client) => void;
  onSelectExisting?: (client: Client) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  client,
  isOpen,
  onClose,
  onSaved,
  onSelectExisting
}) => {
  const { settings } = useAuth();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setMobile(client.mobile);
      setAlternateMobile(client.alternate_mobile || '');
      setEmail(client.email || '');
      setAddress(client.address || '');
      setCity(client.city || '');
      setState(client.state || '');
      setPincode(client.pincode || '');
      setNotes(client.notes || '');
    } else {
      setName('');
      setMobile('');
      setAlternateMobile('');
      setEmail('');
      setAddress('');
      // Dynamic default city & state from studio settings
      setCity(settings?.city || '');
      setState(settings?.state || '');
      setPincode(settings?.pincode || '');
      setNotes('');
    }
    setDuplicateWarning(null);
    setError(null);
  }, [client, isOpen, settings]);

  // Check duplicate mobile as user types
  useEffect(() => {
    if (!mobile || mobile.trim().length < 10) {
      setDuplicateWarning(null);
      return;
    }

    const checkTimer = setTimeout(async () => {
      try {
        const res = await api.checkMobile(mobile.trim(), client?.id);
        if (res.exists) {
          setDuplicateWarning(res.client);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Ignore check failure
      }
    }, 400);

    return () => clearTimeout(checkTimer);
  }, [mobile, client]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client name is required.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      mobile: mobile.trim(),
      alternate_mobile: alternateMobile.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      pincode: pincode.trim() || undefined,
      notes: notes.trim() || undefined
    };

    try {
      if (client) {
        const res = await api.updateClient(client.id, payload);
        onSaved(res.client);
      } else {
        const res = await api.createClient(payload);
        onSaved(res.client);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
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
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-800/40 text-sky-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {client ? 'Edit Client' : 'Add New Client'}
            </h3>
            <p className="text-xs text-slate-400">
              {client ? `Client Code: ${client.client_code}` : 'Enter studio client contact information'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Duplicate Mobile Warning Box */}
        {duplicateWarning && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>A client with this mobile number already exists!</span>
            </div>
            <p className="text-[11px] text-amber-300/80">
              Found: <strong className="text-white">{duplicateWarning.name}</strong> ({duplicateWarning.client_code}) - {duplicateWarning.city || 'No City'}
            </p>
            {onSelectExisting && (
              <button
                type="button"
                onClick={() => {
                  onSelectExisting(duplicateWarning);
                  onClose();
                }}
                className="mt-1 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer min-h-[40px]"
              >
                Select Existing Client ({duplicateWarning.name})
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Mobile <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Primary Mobile Number"
                  className="w-full pl-11 pr-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px] font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alternate Mobile
              </label>
              <input
                type="tel"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
                placeholder="Secondary / Family Contact"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full pl-11 pr-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Address / Residence
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address / Venue"
                className="w-full pl-11 pr-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[48px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[46px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[46px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Pincode"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 min-h-[46px] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Client Notes & Preferences
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP client, preferred candid photographer, etc."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
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
              className="flex-1 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-colors cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {loading ? 'Saving...' : client ? 'Update Client' : 'Save Client'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
