import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, LogOut, AlertTriangle, UserX, Mail, Fingerprint, Clock, Radio } from 'lucide-react';

export const SuspendedAccountModal: React.FC = () => {
  const { user, logout } = useAuth();

  const isSuspended = Boolean(
    user && (user.status === 'blocked' || user.status === 'suspended' || user.isBlocked === true)
  );

  if (!isSuspended || !user) {
    return null;
  }

  const banMessage = user.blockMessage?.trim() || 
    'Your account has been suspended by administration due to policy violations, community guidelines infringement, or terms of service non-compliance.';

  const banReason = user.blockReason?.trim() || 'Terms of Service Violation';

  return (
    <div 
      id="account-suspended-modal-overlay"
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300"
    >
      <div 
        id="account-suspended-card"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/30 bg-[#0F0F12] p-6 sm:p-8 shadow-[0_0_80px_rgba(239,68,68,0.25)] text-center flex flex-col items-center"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-600/20 blur-3xl pointer-events-none rounded-full" />

        {/* Pulsing Icon */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600/30 to-amber-600/20 border border-red-500/40 shadow-inner">
          <ShieldAlert className="h-10 w-10 text-red-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-[#0F0F12]"></span>
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
          Account Suspended
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-5">
          Access to your MaxPlay account has been restricted by platform moderators.
        </p>

        {/* Admin Custom Message Box */}
        <div className="w-full text-left rounded-2xl bg-red-950/20 border border-red-500/25 p-4 sm:p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Admin Notice & Reason
            </span>
            <span className="ml-auto text-[10px] font-semibold bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
              {banReason}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-wrap">
            "{banMessage}"
          </p>
        </div>

        {/* Account Details & Status pill */}
        <div className="w-full bg-[#16161B] rounded-2xl border border-white/5 p-3.5 sm:p-4 mb-6 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <UserX className="h-3.5 w-3.5 text-red-400" /> Account Holder
            </span>
            <span className="font-semibold text-white truncate max-w-[200px]">
              {user.displayName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Mail className="h-3.5 w-3.5 text-zinc-500" /> Registered Email
            </span>
            <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[200px]">
              {user.email}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Fingerprint className="h-3.5 w-3.5 text-zinc-500" /> User UID
            </span>
            <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[180px]">
              {user.uid}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> Live Status
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Suspended (Restricted)
            </span>
          </div>
        </div>

        {/* Live sync notice */}
        <p className="text-[11px] text-zinc-400 mb-5 max-w-sm leading-normal">
          If an administrator unblocks your account, your access will automatically restore in real time without refreshing.
        </p>

        {/* Logout Button */}
        <button
          id="btn-suspended-logout"
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_4px_20px_rgba(225,29,72,0.4)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out of Account</span>
        </button>
      </div>
    </div>
  );
};
