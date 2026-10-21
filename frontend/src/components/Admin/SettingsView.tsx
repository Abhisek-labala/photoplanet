import React, { useState, useEffect } from 'react';
import type { Settings } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, Save, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { refreshSettings } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    studio_name: '',
    tagline: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    alternate_phone: '',
    email: '',
    website: '',
    gst_number: '',
    instagram: '',
    facebook: '',
    youtube: '',
    quotation_prefix: 'SGFX',
    quotation_start_number: 1,
    quotation_validity_days: 15,
    currency_symbol: '₹',
    currency_code: 'INR',
    tax_enabled: 0,
    tax_percentage: 18,
    allow_staff_custom_price: 1,
    default_terms: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(res => {
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    });
  }, []);

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await api.updateSettings(settings);
      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            <span>Studio Master Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Studio letterhead details, quotation numbering rules, tax and default legal terms
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-2xl shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: Studio Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white pb-3 border-b border-slate-800">
            Studio Profile & Letterhead
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Studio Name *</label>
              <input
                type="text"
                value={settings.studio_name}
                onChange={(e) => handleChange('studio_name', e.target.value)}
                placeholder="Studio Name"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[48px]"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Subtitle / Tagline</label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Photography • Cinematography • Albums"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">Studio Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Studio Street Address"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">City</label>
              <input
                type="text"
                value={settings.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Pincode</label>
              <input
                type="text"
                value={settings.pincode || ''}
                onChange={(e) => handleChange('pincode', e.target.value)}
                placeholder="Pincode"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Primary Phone *</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Primary Contact"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Official Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contact@studio.com"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">GSTIN Number</label>
              <input
                type="text"
                value={settings.gst_number || ''}
                onChange={(e) => handleChange('gst_number', e.target.value)}
                placeholder="e.g. 36AABCS1429B1Z8"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Instagram Handle</label>
              <input
                type="text"
                value={settings.instagram || ''}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@studio_official"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Quotation Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white pb-3 border-b border-slate-800">
            Quotation Rules & Numbering
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Quotation Prefix</label>
              <input
                type="text"
                value={settings.quotation_prefix}
                onChange={(e) => handleChange('quotation_prefix', e.target.value.toUpperCase())}
                placeholder="SGFX"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Format: {settings.quotation_prefix}-2026-0001</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Starting Sequence</label>
              <input
                type="number"
                value={settings.quotation_start_number}
                onChange={(e) => handleChange('quotation_start_number', Number(e.target.value))}
                min="1"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Default Validity (Days)</label>
              <input
                type="number"
                value={settings.quotation_validity_days}
                onChange={(e) => handleChange('quotation_validity_days', Number(e.target.value))}
                min="1"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                placeholder="₹"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Currency Code</label>
              <input
                type="text"
                value={settings.currency_code}
                onChange={(e) => handleChange('currency_code', e.target.value.toUpperCase())}
                placeholder="INR"
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Default GST Tax (%)</label>
              <input
                type="number"
                value={settings.tax_percentage}
                onChange={(e) => handleChange('tax_percentage', Number(e.target.value))}
                className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-sm text-white font-mono focus:outline-none focus:border-cyan-500 min-h-[48px]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Default Legal Terms */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white pb-3 border-b border-slate-800">
            Default Global Terms & Conditions
          </h3>

          <div>
            <textarea
              rows={8}
              value={settings.default_terms || ''}
              onChange={(e) => handleChange('default_terms', e.target.value)}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-base sm:text-xs text-white leading-relaxed focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
        >
          <Save className="w-5 h-5" />
          <span>{loading ? 'Saving Changes...' : 'Save All Studio Settings'}</span>
        </button>

      </form>
    </div>
  );
};
