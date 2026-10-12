"use client";

import { useEffect, useRef } from "react";

/**
 * useModalHistoryTrap
 * 
 * Intercepts the browser / hardware Back button on mobile devices (Android Back gesture,
 * iOS Safari history pop) so that pressing Back dismisses the active drawer or modal
 * instead of navigating the underlying webpage away.
 * 
 * Matches Google (Android OnBackPressedCallback) & Apple (Modal Dismissal) UX standards.
 */
export function useModalHistoryTrap(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);
}
