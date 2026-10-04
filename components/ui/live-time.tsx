"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatRelative, formatAbsolute } from "@/lib/time";
import { useNow } from "@/lib/hooks/use-now";
import { clsx } from "clsx";

interface LiveTimeProps {
  ts?: number;
  kind?: "created" | "joined" | "expense" | "edited" | "settled" | "member";
  variant?: "activity" | "compact" | "full";
  className?: string;
  fallback?: string; // Fallback text when ts is undefined
}

export function LiveTime({ 
  ts, 
  kind, 
  variant = "activity", 
  className,
  fallback = "Earlier"
}: LiveTimeProps) {
  const [mounted, setMounted] = useState(false);
  const now = useNow(ts);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className={clsx("inline-flex items-center text-muted-foreground", className)}>
        <span className="h-4 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </span>
    );
  }

  if (!ts) {
    return (
      <span className={clsx("text-muted-foreground", className)}>
        {fallback}
      </span>
    );
  }

  const timeAgo = formatRelative(ts, now);
  const absoluteTime = formatAbsolute(ts);
  const isFresh = (now - ts) < 5 * 60 * 1000; // < 5 minutes

  let prefix = "";
  if (variant === "activity" && kind) {
    switch (kind) {
      case "created": prefix = "Created · "; break;
      case "joined": prefix = "Joined · "; break;
      case "expense": prefix = "Expense added · "; break;
      case "edited": prefix = "Edited · "; break;
      case "settled": prefix = "Settled · "; break;
      case "member": prefix = "Member added · "; break;
    }
  }

  const content = `${prefix}${timeAgo}`;

  return (
    <time 
      dateTime={new Date(ts).toISOString()}
      title={absoluteTime}
      className={clsx("inline-flex items-center gap-1.5 text-muted-foreground transition-colors", className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {isFresh && (
          <motion.span
            key="pulse"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative flex h-2 w-2 items-center justify-center"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </motion.span>
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={content}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="whitespace-nowrap block"
        >
          {content}
        </motion.span>
      </AnimatePresence>
    </time>
  );
}
