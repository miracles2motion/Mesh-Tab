"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center rounded-2xl font-semibold transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:bg-indigo-800",
      secondary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm transition-colors",
      ghost: "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white/90 hover:text-slate-900 dark:hover:text-white",
      glass: "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-200/80 dark:hover:bg-white/10 backdrop-blur-md shadow-sm",
      destructive: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 border border-rose-500/20 dark:border-rose-500/30",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg",
      icon: "h-12 w-12",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
