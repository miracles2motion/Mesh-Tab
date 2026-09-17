import Link from "next/link";
import { ArrowLeft, Bell, Receipt, Activity, RefreshCw } from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";

export default function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      icon: <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: "bg-indigo-500/10",
      title: "New Expense Added",
      desc: "Aisha added 'Villa booking' for $600 to Lisbon Weekend.",
      time: "2m ago",
      unread: true
    },
    {
      id: 2,
      icon: <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: "bg-emerald-500/10",
      title: "Tangle Netting Optimized",
      desc: "Lisbon Weekend debts were simplified. You saved 2 transfers.",
      time: "1h ago",
      unread: true
    },
    {
      id: 3,
      icon: <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-500/10",
      title: "Settlement Received",
      desc: "Ben settled his $80.00 balance in AUSD.",
      time: "Yesterday",
      unread: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
      <header className="px-6 md:px-12 pt-10 pb-6 border-b border-slate-200 dark:border-white/10 max-w-3xl mx-auto w-full flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/home" 
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-white/80"
            title="Back to Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="px-6 md:px-12 max-w-3xl mx-auto w-full py-8 space-y-4">
        {notifications.map((notif) => (
          <div key={notif.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-colors shadow-sm ${notif.unread ? "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" : "bg-white/40 dark:bg-transparent border-slate-100 dark:border-transparent hover:bg-white dark:hover:bg-white/5"}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${notif.bg}`}>
              {notif.icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white/90">{notif.title}</h3>
                <span className="text-xs text-slate-400 dark:text-white/40">{notif.time}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">{notif.desc}</p>
            </div>
            {notif.unread && (
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-2" />
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
