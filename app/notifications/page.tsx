"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ExternalLink
} from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { useNotifications, formatTimeAgo, NotificationType, AppNotification } from "../../lib/notifications";
import { useWorkspaceMode } from "../../lib/user";
import { sounds } from "../../lib/sounds";
import { toast } from "sonner";

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { mode: workspaceMode } = useWorkspaceMode();
  const [filter, setFilter] = useState<"all" | "unread" | "expense" | "settlement" | "netting">("all");

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
      default:
        return {
          icon: <Activity className="w-5 h-5 text-slate-600 dark:text-white/60" />,
          bg: "bg-slate-500/10 border-slate-500/20"
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
      <header className="px-6 md:px-12 pt-8 pb-5 border-b border-slate-200/80 dark:border-white/10 max-w-3xl mx-auto w-full flex items-center justify-between sticky top-0 bg-[#f5f5f7]/85 dark:bg-[#0a0a0a]/85 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <Link 
            href="/home" 
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80 cursor-pointer"
            title="Back to Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
              {workspaceMode === "blank" ? "Clean Slate (Live real-time feed)" : "Sample Trip Mode (Lisbon & Demo updates)"}
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

          <ThemeToggle />
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-3xl mx-auto w-full py-6 space-y-6">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
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
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-white/5 text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
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
                  className={`group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${
                    isClickable ? "cursor-pointer hover:scale-[1.008] active:scale-[0.99]" : ""
                  } ${
                    notif.unread
                      ? "bg-white dark:bg-white/5 border-indigo-200 dark:border-indigo-500/20 shadow-indigo-500/5"
                      : "bg-white/50 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 hover:bg-white dark:hover:bg-white/5"
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
                          {formatTimeAgo(notif.timestamp)}
                        </span>
                        {notif.unread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-500/20" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-white/65 leading-relaxed break-words">
                      {notif.desc}
                    </p>

                    {/* Footer link cue if clickable */}
                    {notif.link && (
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
