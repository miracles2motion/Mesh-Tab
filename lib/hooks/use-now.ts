"use client";

import { useState, useEffect } from "react";

let subscribers: Set<(now: number) => void> = new Set();
let timerId: ReturnType<typeof setInterval> | null = null;
let currentInterval: number | null = null;
let activeTimestamps: Set<number> = new Set();

function evaluateInterval() {
  const now = Date.now();
  let hasRecent = false;
  
  for (const ts of activeTimestamps) {
    if (now - ts < 60 * 60 * 1000) {
      hasRecent = true;
      break;
    }
  }

  const targetInterval = hasRecent ? 15000 : 60000;
  
  if (currentInterval !== targetInterval) {
    if (timerId !== null) clearInterval(timerId);
    currentInterval = targetInterval;
    timerId = setInterval(tick, currentInterval);
  }
}

function tick() {
  if (document.visibilityState === "hidden") return;
  const now = Date.now();
  for (const sub of subscribers) {
    sub(now);
  }
}

export function useNow(timestamp?: number): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (timestamp) {
      activeTimestamps.add(timestamp);
      evaluateInterval();
    }

    const sub = (n: number) => setNow(n);
    subscribers.add(sub);
    
    if (subscribers.size === 1) {
      evaluateInterval();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
      }
    };
    
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      subscribers.delete(sub);
      if (timestamp) {
        activeTimestamps.delete(timestamp);
      }
      
      document.removeEventListener("visibilitychange", onVisibilityChange);
      
      if (subscribers.size === 0 && timerId !== null) {
        clearInterval(timerId);
        timerId = null;
        currentInterval = null;
      } else {
        evaluateInterval();
      }
    };
  }, [timestamp]);

  return now;
}
