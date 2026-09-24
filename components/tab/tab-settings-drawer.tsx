"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Edit3, Archive, RotateCcw, Globe, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";
import { SUPPORTED_CURRENCIES } from "../../lib/pyth";

interface TabSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tabId: string;
  tabName: string;
  tabCurrency?: string;
  isCreator: boolean;
}

export function TabSettingsDrawer({ isOpen, onClose, tabId, tabName, tabCurrency = "USD", isCreator }: TabSettingsDrawerProps) {
  const [name, setName] = useState(tabName);
  const [currency, setCurrency] = useState(tabCurrency);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(tabName);
    setCurrency(tabCurrency);
  }, [tabName, tabCurrency]);

  const handleSave = () => {
    sounds.playClick();
    setSaving(true);
    
    // Update tab name in stored tabs
    try {
      const modes = ["meshTab_sample_tabs", "meshTab_clean_tabs"];
      modes.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const tabs = JSON.parse(raw);
          const updated = tabs.map((t: { id: string; name: string; currency?: string }) => {
            if (t.id === tabId) {
              return { ...t, name: name.trim() || tabName, currency };
            }
            return t;
          });
          localStorage.setItem(key, JSON.stringify(updated));
        }
      });
      window.dispatchEvent(new Event("meshTab-tabs-update"));
    } catch (e) { /* ignore storage errors in demo */ }

    setTimeout(() => {
      setSaving(false);
      toast.success("Tab Updated", { description: `"${name.trim()}" saved with ${currency} currency.` });
      onClose();
    }, 500);
  };

  const handleArchive = () => {
    sounds.playPop();
    
    // In demo mode: mark the tab as archived in localStorage
    try {
      const archivedKey = "meshTab_archived";
      const raw = localStorage.getItem(archivedKey);
      const archived: string[] = raw ? JSON.parse(raw) : [];
      if (!archived.includes(tabId)) {
        archived.push(tabId);
        localStorage.setItem(archivedKey, JSON.stringify(archived));
      }
      window.dispatchEvent(new Event("meshTab-tabs-update"));
    } catch (e) { /* ignore */ }

    toast.success("Tab Archived", {
      description: `"${tabName}" has been archived. You can restore it anytime.`,
      action: {
        label: "Undo",
        onClick: () => {
          try {
            const raw = localStorage.getItem("meshTab_archived");
            const archived: string[] = raw ? JSON.parse(raw) : [];
            const updated = archived.filter(id => id !== tabId);
            localStorage.setItem("meshTab_archived", JSON.stringify(updated));
            window.dispatchEvent(new Event("meshTab-tabs-update"));
            toast.info("Tab Restored");
          } catch (e) { /* ignore */ }
        }
      }
    });
    onClose();
  };

  const handleReset = () => {
    sounds.playPop();
    
    // Clear expenses and member data for this tab
    try {
      const expenseKeys = [`meshTab_expenses_${tabId}`, `meshTab_clean_expenses_${tabId}`];
      const memberKeys = [`meshTab_members_${tabId}`, `meshTab_clean_members_${tabId}`];
      [...expenseKeys, ...memberKeys].forEach(k => localStorage.removeItem(k));
      window.dispatchEvent(new Event("meshTab-expenses-update"));
      window.dispatchEvent(new Event("meshTab-members-update"));
    } catch (e) { /* ignore */ }

    toast.success("Tab Reset", { description: `All expenses and balances in "${tabName}" have been cleared.` });
    setShowResetConfirm(false);
    onClose();
  };

  const handleDelete = () => {
    sounds.playPop();
    
    // Remove tab from stored tabs list
    try {
      const modes = ["meshTab_sample_tabs", "meshTab_clean_tabs"];
      modes.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const tabs = JSON.parse(raw);
          const filtered = tabs.filter((t: { id: string }) => t.id !== tabId);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      });
      // Also clear tab-specific data
      const expenseKeys = [`meshTab_expenses_${tabId}`, `meshTab_clean_expenses_${tabId}`];
      const memberKeys = [`meshTab_members_${tabId}`, `meshTab_clean_members_${tabId}`];
      [...expenseKeys, ...memberKeys].forEach(k => localStorage.removeItem(k));
      
      window.dispatchEvent(new Event("meshTab-tabs-update"));
    } catch (e) { /* ignore */ }

    toast.success("Tab Deleted", { description: `"${tabName}" has been permanently removed.` });
    onClose();
    // Navigate to home after a brief delay
    setTimeout(() => { window.location.href = "/home"; }, 300);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Drawer */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="relative w-full max-w-md mx-auto bg-white dark:bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[85vh] overflow-y-auto"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                <Settings className="w-4 h-4 text-slate-600 dark:text-white/70" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tab Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Tab Name */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2 block">
                Tab Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all pr-10"
                  placeholder="e.g., Lisbon Weekend"
                />
                <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
              </div>
            </div>

            {/* Default Currency */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-2 block">
                Default Currency
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code} className="text-black">
                      {c.flag} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || (!name.trim())}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-white/10" />

            {/* Danger Zone */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider">
                Actions
              </h4>

              {/* Archive */}
              {!showArchiveConfirm ? (
                <button
                  onClick={() => { sounds.playClick(); setShowArchiveConfirm(true); }}
                  className="w-full py-3 rounded-xl bg-amber-50 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors cursor-pointer"
                >
                  <Archive className="w-4 h-4" /> Archive Tab
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 space-y-2">
                  <p className="text-xs text-amber-800 dark:text-amber-300">Archive this tab? It will be hidden from your main view but can be restored later.</p>
                  <div className="flex gap-2">
                    <button onClick={handleArchive} className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-semibold text-xs cursor-pointer hover:bg-amber-700 transition-colors">
                      Yes, Archive
                    </button>
                    <button onClick={() => setShowArchiveConfirm(false)} className="flex-1 py-2 rounded-lg bg-white dark:bg-white/10 text-slate-700 dark:text-white/70 font-semibold text-xs border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reset Data */}
              {!showResetConfirm ? (
                <button
                  onClick={() => { sounds.playClick(); setShowResetConfirm(true); }}
                  className="w-full py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Tab Data
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/8 border border-rose-200 dark:border-rose-500/20 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-800 dark:text-rose-300">This will clear all expenses and reset all member balances to $0. This cannot be undone.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-semibold text-xs cursor-pointer hover:bg-rose-700 transition-colors">
                      Yes, Reset
                    </button>
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 rounded-lg bg-white dark:bg-white/10 text-slate-700 dark:text-white/70 font-semibold text-xs border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Delete (Creator only) */}
              {isCreator && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => { sounds.playClick(); setShowDeleteConfirm(true); }}
                      className="w-full py-3 rounded-xl bg-rose-50 dark:bg-rose-500/8 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-500/15 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Tab Permanently
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/8 border border-rose-200 dark:border-rose-500/20 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">Permanently delete &quot;{tabName}&quot; and all associated data? This cannot be undone.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-rose-700 text-white font-semibold text-xs cursor-pointer hover:bg-rose-800 transition-colors">
                          Delete Forever
                        </button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg bg-white dark:bg-white/10 text-slate-700 dark:text-white/70 font-semibold text-xs border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
