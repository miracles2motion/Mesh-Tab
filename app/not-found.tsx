import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
      <h1 className="text-6xl font-black mb-4 tracking-tight">404</h1>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 text-sm">
        The tab or screen you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/home"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
}
