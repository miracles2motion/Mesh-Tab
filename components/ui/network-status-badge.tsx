"use client";

import { useNetworkStatus } from "../../lib/network";
import { WifiOff, Activity, Plane, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function NetworkStatusBadge({ compact = false }: { compact?: boolean }) {
  const { isSimulatedOffline, isEffectivelyOnline, pendingCount, toggleAirplaneMode } = useNetworkStatus();
  
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (isEffectivelyOnline) {
      if (pendingCount > 0) {
        setJustReconnected(true);
        const timer = setTimeout(() => setJustReconnected(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isEffectivelyOnline, pendingCount]);

  const handleToggleAirplane = () => {
    if (!isSimulatedOffline) {
      toast("✈️ Airplane Mode Simulated", {
        description: "All network requests paused. Your expenses are saved locally."
      });
    } else {
      toast("🟢 Back Online", {
        description: pendingCount > 0 ? `Syncing ${pendingCount} local expense(s) to Monad Sandbox...` : "Connected to Monad Sandbox."
      });
    }
    toggleAirplaneMode();
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0" aria-live="polite">
      <AnimatePresence mode="wait">
        {isEffectivelyOnline ? (
          <motion.div
            key="online"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
              justReconnected 
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40" 
                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
            }`}
          >
            {pendingCount > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className={compact ? "hidden sm:inline" : ""}>Syncing {pendingCount}...</span>
              </>
            ) : justReconnected ? (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span className={compact ? "hidden sm:inline" : ""}>Reconnected</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span className={compact ? "hidden sm:inline" : ""}>Synced</span>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="offline"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)] dark:shadow-[0_0_8px_rgba(245,158,11,0.1)] relative"
          >
            <div className="absolute inset-0 rounded-full border border-amber-400/30 dark:border-amber-400/20 animate-pulse" style={{ pointerEvents: 'none' }} />
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span className={compact ? "hidden sm:inline" : ""}>
              {pendingCount > 0 ? `Offline • ${pendingCount} in Vault` : "Offline Mesh Active"}
            </span>
            {compact && pendingCount > 0 && (
               <span className="sm:hidden font-bold ml-1">{pendingCount}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleToggleAirplane}
        className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 ${
          isSimulatedOffline 
            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30" 
            : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white/80"
        }`}
        title={isSimulatedOffline ? "Turn Off Airplane Mode" : "Simulate Airplane Mode"}
        aria-label="Simulate airplane mode"
        role="switch"
        aria-checked={isSimulatedOffline}
      >
        <Plane className={`w-3.5 h-3.5 transition-transform duration-200 ${isSimulatedOffline ? "rotate-90" : ""}`} />
      </button>
    </div>
  );
}
