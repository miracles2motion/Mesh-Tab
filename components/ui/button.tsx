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
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30",
      secondary: "bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]",
      ghost: "hover:bg-white/10 text-white/90 hover:text-white",
      glass: "bg-white/5 border border-white/10 text-white hover:bg-white/10 backdrop-blur-md",
      destructive: "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30",
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
