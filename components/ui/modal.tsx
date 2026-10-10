"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useModalHistoryTrap } from "../../lib/use-modal-history-trap";

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  hideCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "w-[98vw] h-[98vh] max-w-[98vw] max-h-[98vh] m-auto rounded-3xl",
};

export function Modal({ children, onClose, className, hideCloseButton = false, size = "full" }: ModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [onClose, router]);

  // If this is an inline modal (onClose is passed), trap hardware back to dismiss it cleanly
  useModalHistoryTrap(Boolean(onClose), handleClose);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehaviorY = "none";
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    
    return () => {
      document.body.style.overflow = "auto";
      document.body.style.overscrollBehaviorY = "auto";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "relative w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden text-slate-900 dark:text-white",
            "sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] h-full sm:h-auto my-auto flex flex-col",
            sizeClasses[size],
            className
          )}
        >
          {!hideCloseButton && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/50 dark:hover:text-white transition-colors z-10 shadow-sm cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
