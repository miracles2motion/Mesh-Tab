export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
      <div className="relative w-16 h-16 flex items-center justify-center mb-4">
        {/* Ambient pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 opacity-60 blur-md animate-pulse" />
        {/* Spinner center */}
        <div className="relative w-12 h-12 rounded-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-lg">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-white/50 tracking-wide uppercase">
        Loading MeshTab...
      </p>
    </div>
  );
}
