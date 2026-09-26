"use client";

import Link from "next/link";
import { ThemeToggle } from "../theme-toggle";
import { Settings } from "lucide-react";
import { useUserProfile } from "../../lib/user";
import { useEffect, useState } from "react";

export function GlobalNav() {
  const profile = useUserProfile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentUserName = mounted ? profile.name : "David";
  const avatarColor = mounted ? profile.avatarColor : "bg-indigo-600";

  return (
    <div className="w-full border-b border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/home" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/brand/logo/logo-light.svg" alt="MeshTab Logo" className="h-[22px] w-auto dark:hidden" />
            <img src="/brand/logo/logo-dark.svg" alt="MeshTab Logo" className="h-[22px] w-auto hidden dark:block" />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          
          <Link 
            href="/settings"
            className="p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 transition-colors shadow-sm"
            title="Global Settings"
            aria-label="Global Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          
          <Link 
            href="/settings"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-transform`}
            title={`Profile (${currentUserName})`}
          >
            {currentUserName ? currentUserName[0].toUpperCase() : "U"}
          </Link>
        </div>
      </div>
    </div>
  );
}
