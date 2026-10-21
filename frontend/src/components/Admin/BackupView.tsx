import React, { useState } from 'react';
import { api } from '../../services/api';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const BackupView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleDownloadDb = () => {
    window.location.href = api.downloadDbUrl;
  };

  const handleExportJson = () => {
    window.location.href = api.exportJsonUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePromptRestore = () => {
    if (!selectedFile) {
      alert('Please select a .db or .json backup file first.');
      return;
    }
    setShowConfirmModal(true);
  };

  const executeRestore = async () => {
    if (!selectedFile) return;
    setRestoring(true);
    setStatusMessage(null);
    try {
      const res = await api.restoreBackup(selectedFile);
      setShowConfirmModal(false);
      setSelectedFile(null);
      setStatusMessage(res.message || 'Database restored successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
          <Database className="w-6 h-6 text-emerald-400" />
          <span>Database Backup & Safe Restore</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Complete local database safety module. Download atomic SQLite snapshots or restore prior states safely.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Backup Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-2 mb-5">
            <div className="p-3 w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Full SQLite Database (.db)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Downloads the complete raw SQLite database file with all tables, transactions, foreign keys, and quotation item snapshots.
            </p>
          </div>

          <button
            onClick={handleDownloadDb}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download SQLite Backup</span>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-2 mb-5">
            <div className="p-3 w-12 h-12 rounded-2xl bg-sky-950/60 border border-sky-800/40 text-sky-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Portable JSON Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exports all clients, quotations, events and master pricing as formatted JSON for portability and spreadsheet conversion.
            </p>
          </div>

          <button
            onClick={handleExportJson}
            className="w-full py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Data</span>
          </button>
        </div>

      </div>

      {/* Restore Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 text-base font-bold text-white pb-3 border-b border-slate-800">
          <Upload className="w-5 h-5 text-amber-400" />
          <span>Restore Application Data</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Upload a previously downloaded <code className="text-sky-300">.db</code> or <code className="text-sky-300">.json</code> backup file. Before restoring, the system will prompt you with an option to create an automatic safety snapshot of the current state.
        </p>

        <div className="p-4 bg-slate-950 border border-dashed border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <input
            type="file"
            accept=".db,.sqlite,.json"
            onChange={handleFileChange}
            className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />

          <button
            onClick={handlePromptRestore}
            disabled={!selectedFile || restoring}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-40"
          >
            {restoring ? 'Restoring...' : 'Restore from File'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal (Section 30 requirement) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-800/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-xs">
            
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-800/60">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">WARNING: Restore Confirmation</h3>
                <p className="text-[11px] text-amber-400">Database Replacement Action</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed mb-6">
              <p>
                Restoring this backup (<strong className="text-white">{selectedFile?.name}</strong>) will replace current quotation, event, and client records.
              </p>
              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-800/40 text-amber-300 font-medium">
                Create a backup of the current database first?
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  handleDownloadDb();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backup Now (Recommended)</span>
              </button>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeRestore}
                  disabled={restoring}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-colors"
                >
                  {restoring ? 'Restoring...' : 'Proceed & Restore'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
