"use client";

import * as React from "react";
import { MeshBuddy } from "../../components/ui/mesh-buddy";
import { AuthGuard } from "../../components/providers/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] text-slate-900 dark:text-white flex flex-col transition-colors duration-300">
        <main className="flex-1 flex flex-col relative">
          {children}
        </main>
        <MeshBuddy />
      </div>
    </AuthGuard>
  );
}

