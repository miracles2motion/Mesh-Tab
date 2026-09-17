import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../../components/theme-toggle";

import { Settings, LayoutGrid } from "lucide-react";
import { MeshBuddy } from "../../components/ui/mesh-buddy";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col transition-colors duration-300">
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/mesh-logo-dark.svg" alt="MeshTab" width={100} height={28} className="hidden dark:block" />
            <Image src="/mesh-logo-light.svg" alt="MeshTab" width={100} height={28} className="dark:hidden" />
          </Link>
          <div className="flex items-center gap-3 md:gap-4">
            <Link 
              href="/home" 
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Tabs</span>
            </Link>
            <Link 
              href="/settings" 
              className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>
      
      {/* Spacer for fixed nav */}
      <div className="h-16" />
      
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
      <MeshBuddy />
    </div>
  );
}
