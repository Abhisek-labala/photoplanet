import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  X,
  Lock,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, updateCurrentUser } = useAuth();
  const isCurrentlyEnabled = Boolean(user?.two_factor_enabled);

  // Setup state
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string; otpauth: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Disable state
  const [disablePassword, setDisablePassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setVerificationCode('');
      setDisablePassword('');
      if (!isCurrentlyEnabled) {
        loadSetupData();
      }
    }
  }, [isOpen, isCurrentlyEnabled]);

  const loadSetupData = async () => {
    setLoadingSetup(true);
    setErrorMessage(null);
    try {
      const data = await api.setup2FA();
      setSetupData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize 2FA setup.');
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleCopyKey = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData?.secret || !verificationCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.enable2FA({
        secret: setupData.secret,
        code: verificationCode.trim()
      });

      if (user) {
        updateCurrentUser({ ...user, two_factor_enabled: 1 });
      }

      setSuccessMessage(res.message || 'Google Authenticator activated successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify code. Please check your app.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      setErrorMessage('Please enter your account password to confirm.');
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.disable2FA({ password: disablePassword });
      if (user) {
        updateCurrentUser({ ...user, two_factor_enabled: 0 });
      }

      setSuccessMessage(res.message || 'Google Authenticator disabled.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disable 2FA. Incorrect password.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-sm flex justify-center items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCurrentlyEnabled
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
              }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Google Authenticator
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${isCurrentlyEnabled
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                  {isCurrentlyEnabled ? 'ACTIVE' : 'OPTIONAL'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Two-Factor Authentication (TOTP)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="mb-3.5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE A: ENABLE 2FA FLOW */}
        {!isCurrentlyEnabled ? (
          <div>
            {loadingSetup ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
                <p className="text-xs font-medium">Generating secure QR code...</p>
              </div>
            ) : setupData ? (
              <form onSubmit={handleEnable2FA} className="space-y-4">

                {/* Visual QR Code & Scan instructions */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <p className="text-xs text-slate-300 mb-2.5">
                    Scan this QR code with <span className="font-semibold text-white">Google Authenticator</span>:
                  </p>

                  <div className="inline-block p-2 bg-white rounded-xl shadow-md">
                    <img
                      src={setupData.qrCode}
                      alt="2FA QR Code"
                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain block mx-auto"
                    />
                  </div>

                  {/* Manual Key */}
                  <div className="mt-2.5 pt-2 border-t border-slate-850">
                    <div className="text-[10px] text-slate-400 mb-1">
                      Can't scan? Use manual secret key:
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-sky-300 max-w-full">
                      <span className="truncate tracking-wider">{setupData.secret}</span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Copy key"
                      >
                        {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    {copiedKey && (
                      <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                        Key copied to clipboard!
                      </p>
                    )}
                  </div>
                </div>

                {/* 6-Digit Code Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                    Enter 6-digit code shown in app:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000 000"
                    className="w-full py-2.5 px-4 text-center tracking-[0.35em] font-mono text-lg font-bold bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-h-[44px]"
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer min-h-[40px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || verificationCode.length < 6}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold text-xs text-white shadow-lg shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center justify-center gap-2"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Activate 2FA</span>
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ) : (
          /* MODE B: DISABLE 2FA FLOW */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200 leading-relaxed">
                <p className="font-semibold text-white mb-0.5">Google Authenticator is currently ACTIVE.</p>
                A 6-digit code from your app is required on every login.
              </div>
            </div>

            <form onSubmit={handleDisable2FA} className="space-y-3.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Disable Google Authenticator
              </h4>
              <p className="text-[11px] text-slate-400">
                To turn off 2FA, enter your current account password:
              </p>

              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 min-h-[38px]"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer min-h-[38px]"
                >
                  Keep 2FA
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !disablePassword}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50 min-h-[38px] flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Disable 2FA</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
