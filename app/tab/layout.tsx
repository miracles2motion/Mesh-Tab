import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../../components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black/40 text-white flex flex-col">
      <nav className="fixed top-0 w-full bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/mesh-logo-dark.svg" alt="MeshTab" width={100} height={28} className="hidden dark:block" />
            <Image src="/mesh-logo-light.svg" alt="MeshTab" width={100} height={28} className="dark:hidden" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </nav>
      
      {/* Spacer for fixed nav */}
      <div className="h-16" />
      
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
