"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Bell, 
  Receipt, 
  Activity, 
  RefreshCw, 
  CheckCheck, 
  Trash2, 
  Zap, 
  CheckCircle2, 
  ArrowDownToLine, 
  Sparkles, 
  FolderPlus,
  Filter,
  ExternalLink,
  HandCoins
} from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { useNotifications, NotificationType, AppNotification } from "../../lib/notifications";
import { LiveTime } from "@/components/ui/live-time";
import { useWorkspaceMode } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";
import { GlobalNav } from "../../components/ui/global-nav";
import { AuthGuard } from "../../components/providers/auth-guard";

function NotificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from");
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { mode: workspaceMode } = useWorkspaceMode();
  const [filter, setFilter] = useState<"all" | "unread" | "expense" | "settlement" | "netting">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBack = () => {
    sounds.playClick();
    if (fromUrl && fromUrl.startsWith("/")) {
      router.replace(fromUrl);
    } else if (typeof window !== "undefined" && window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      router.replace("/home");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (filter === "unread") return notif.unread;
      if (filter === "expense") return notif.type === "expense";
      if (filter === "settlement") return notif.type === "settlement" || notif.type === "cashout";
      if (filter === "netting") return notif.type === "netting";
      return true;
    });
  }, [notifications, filter]);

  const handleMarkAllRead = () => {
    sounds.playClick();
    markAllAsRead();
    toast.success("All caught up!", { description: "Marked all notifications as read." });
  };

  const handleClearAll = () => {
    sounds.playPop();
    clearAll();
    toast.info("Notifications cleared");
  };

  const handleClickNotification = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      sounds.playClick();
      router.push(notif.link);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "expense":
        return {
          icon: <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
          bg: "bg-indigo-500/10 border-indigo-500/20"
        };
      case "settlement":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
          bg: "bg-emerald-500/10 border-emerald-500/20"
        };
      case "netting":
        return {
          icon: <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
          bg: "bg-purple-500/10 border-purple-500/20"
        };
      case "tab_created":
        return {
          icon: <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
          bg: "bg-blue-500/10 border-blue-500/20"
        };
      case "cashout":
        return {
          icon: <ArrowDownToLine className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
          bg: "bg-emerald-500/10 border-emerald-500/20"
        };
      case "faucet":
        return {
          icon: <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
          bg: "bg-amber-500/10 border-amber-500/20"
        };
      case "payment_request":
        return {
          icon: <HandCoins className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
          bg: "bg-rose-500/10 border-rose-500/20"
        };
      default:
        return {
          icon: <Activity className="w-5 h-5 text-slate-600 dark:text-white/60" />,
          bg: "bg-slate-500/10 border-slate-500/20"
        };
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Loading Notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
      <GlobalNav />
      <header className="px-6 md:px-12 pt-8 pb-5 border-b border-slate-200/80 dark:border-white/10 max-w-5xl mx-auto w-full flex items-center justify-between bg-[#f5f5f7] dark:bg-[#0a0a0a] z-20">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80 cursor-pointer"
            title={fromUrl?.startsWith("/tab") ? "Back to Tab" : "Back to Hub"}
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
              {workspaceMode === "blank" ? "Activity and settlement updates across your tabs." : "Sample Trip Mode (Lisbon & Demo updates)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-white/70 flex items-center justify-center transition-all cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-4xl mx-auto w-full py-6 space-y-6">
        {/* Filter Pills */}
        <div className="flex items-center justify-center sm:justify-start overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
          <div className="p-1 bg-slate-200/50 dark:bg-white/5 rounded-full border border-slate-300/50 dark:border-white/10 flex gap-1">
            {[
              { id: "all", label: `All (${notifications.length})` },
              { id: "unread", label: `Unread (${unreadCount})` },
              { id: "expense", label: "Expenses" },
              { id: "settlement", label: "Settlements" },
              { id: "netting", label: "Tangle Netting" }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  sounds.playClick();
                  setFilter(item.id as any);
                }}
                className={`px-3.5 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  filter === item.id
                    ? "bg-white dark:bg-[#1a1a1a] text-indigo-600 dark:text-white shadow-sm shadow-black/5 dark:shadow-black/20"
                    : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Stream */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const { icon, bg } = getNotificationIcon(notif.type);
              const isClickable = Boolean(notif.link);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleClickNotification(notif)}
                  className={`group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
                    isClickable ? "cursor-pointer hover:scale-[1.008] active:scale-[0.99]" : ""
                  } ${
                    notif.unread
                      ? "bg-white dark:bg-white/[0.04] border-indigo-200 dark:border-indigo-500/20 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/10"
                      : "bg-white/80 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-white/5 ring-1 ring-black/5 dark:ring-white/5"
                  }`}
                >
                  {/* Icon Avatar */}
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${bg}`}>
                    {icon}
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-bold tracking-tight ${notif.unread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-white/80"}`}>
                          {notif.title}
                        </h3>

                        {/* Actor Badge */}
                        {notif.actor && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60">
                            {notif.actor === "Mesh Engine" ? "⚙️ Netting Engine" : notif.actor}
                          </span>
                        )}

                        {/* Tab Name Badge */}
                        {notif.tabName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {notif.tabName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 dark:text-white/40 tabular-nums">
                          <LiveTime ts={notif.timestamp} variant="compact" fallback="Recent" />
                        </span>
                        {notif.unread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-500/20" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-white/65 leading-relaxed break-words">
                      {notif.desc}
                    </p>

                    {/* 1-Tap Quick Actions */}
                    {(notif.type === "payment_request" || notif.type === "expense") && notif.tabId && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {notif.type === "payment_request" && (
                          <Link
                            href={`/tab/${notif.tabId}?settle=true`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-[11px] font-bold shadow-sm hover:bg-slate-800 dark:hover:bg-white/90 transition-all active:scale-95"
                          >
                            <Zap className="w-3 h-3" /> Settle Now
                          </Link>
                        )}
                        {notif.type === "payment_request" && (
                          <Link
                            href={`/tab/${notif.tabId}?netting=true`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
                          >
                            <Activity className="w-3 h-3" /> Verify Netting
                          </Link>
                        )}
                        <Link
                          href={`/tab/${notif.tabId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70 text-[11px] font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> View Tab
                        </Link>
                      </div>
                    )}

                    {/* Footer link cue if clickable */}
                    {notif.link && !(notif.type === "payment_request" || notif.type === "expense") && (
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        <span>Open tab details</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 text-center space-y-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <Bell className="w-8 h-8 opacity-70" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm mx-auto mt-1">
                {filter === "unread" 
                  ? "You have zero unread notifications. Tap 'All' to review previous tab activity."
                  : "No notifications found. When friends add expenses, settle debts, or run Tangle Netting, you'll see them here in real-time."}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-all cursor-pointer"
                >
                  Show All Notifications
                </button>
              )}
              <Link
                replace
                href="/home"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                Go to Group Tabs
              </Link>
            </div>
          </div>
        )}
      </main>

      <MeshBuddy />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a]" />}>
        <NotificationsContent />
      </Suspense>
    </AuthGuard>
  );
}
