"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateThemeState = () => {
      const darkActive = document.documentElement.classList.contains("dark");
      setIsDark(darkActive);
    };

    updateThemeState();

    window.addEventListener("theme-change", updateThemeState);
    window.addEventListener("storage", updateThemeState);

    return () => {
      window.removeEventListener("theme-change", updateThemeState);
      window.removeEventListener("storage", updateThemeState);
    };
  }, []);

  const toggleTheme = () => {
    const willBeDark = !isDark;
    if (willBeDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(willBeDark);
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <button 
      onClick={toggleTheme}
      className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/80 transition-colors shadow-sm cursor-pointer"
      aria-label={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
    </button>
  );
}
