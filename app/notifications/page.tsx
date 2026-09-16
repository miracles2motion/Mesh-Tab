import Link from "next/link";
import { ArrowLeft, Bell, Receipt, Activity, RefreshCw } from "lucide-react";

export default function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      icon: <Receipt className="w-5 h-5 text-indigo-400" />,
      bg: "bg-indigo-500/10",
      title: "New Expense Added",
      desc: "Sarah added 'Villa booking' for $600 to Lisbon Weekend.",
      time: "2m ago",
      unread: true
    },
    {
      id: 2,
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      bg: "bg-emerald-500/10",
      title: "Tangle Netting Optimized",
      desc: "Lisbon Weekend debts were simplified. You saved 2 transfers.",
      time: "1h ago",
      unread: true
    },
    {
      id: 3,
      icon: <RefreshCw className="w-5 h-5 text-amber-400" />,
      bg: "bg-amber-500/10",
      title: "Settlement Received",
      desc: "Ben settled up his $80 debt via USDC on Monad.",
      time: "Yesterday",
      unread: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="px-6 md:px-12 pt-10 pb-6 border-b border-white/10 max-w-3xl mx-auto w-full flex items-center gap-4 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-10">
        <Link href="/home" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        </div>
      </header>

      <main className="px-6 md:px-12 max-w-3xl mx-auto w-full py-8 space-y-4">
        {notifications.map((notif) => (
          <div key={notif.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-colors ${notif.unread ? "bg-white/5 border-white/10" : "bg-transparent border-transparent hover:bg-white/5"}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${notif.bg}`}>
              {notif.icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-white/90">{notif.title}</h3>
                <span className="text-xs text-white/40">{notif.time}</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{notif.desc}</p>
            </div>
            {notif.unread && (
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-2" />
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
