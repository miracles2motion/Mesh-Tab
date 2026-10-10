"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useModalHistoryTrap } from "../../lib/use-modal-history-trap";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  full: "sm:max-w-[98vw] sm:h-[94vh] sm:max-h-[94vh] sm:m-auto sm:rounded-3xl",
};

export function Sheet({ isOpen, onClose, children, className, size = "full" }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();

  // Trap mobile hardware / gesture back button to dismiss the sheet first
  useModalHistoryTrap(isOpen, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling and stop mobile browser pull-to-refresh
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehaviorY = "none";

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);

      return () => {
        document.body.style.overflow = "auto";
        document.body.style.overscrollBehaviorY = "auto";
        window.removeEventListener("keydown", handleEscape);
      };
    } else {
      document.body.style.overflow = "auto";
      document.body.style.overscrollBehaviorY = "auto";
    }
  }, [isOpen, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 75 || velocity.y > 350) {
                onClose();
              }
            }}
            className={cn(
              "relative w-full bg-white dark:bg-[#0a0a0a] border-t sm:border border-slate-200 dark:border-white/10 shadow-2xl text-slate-900 dark:text-white",
              "rounded-t-[32px] sm:rounded-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden drawer-container overscroll-contain",
              size === "full" ? "sm:max-h-[96vh] sm:h-[96vh]" : "",
              sizeClasses[size],
              className
            )}
          >
            {/* Mobile Drag Handle Header (Dedicated gesture capture area) */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="w-full flex flex-col items-center pt-3.5 pb-2.5 sm:hidden cursor-grab active:cursor-grabbing drawer-handle touch-none select-none shrink-0"
              role="button"
              tabIndex={0}
              aria-label="Drag down to close drawer"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full hover:bg-slate-400 dark:hover:bg-white/30 transition-colors pointer-events-none" />
            </div>

            {/* Close Button for desktop and mobile header */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/50 dark:hover:text-white transition-colors z-20 shadow-sm cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Scrollable Content Area with Safe-Area Padding */}
            <div className="flex-1 overflow-y-auto drawer-container pb-safe">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
