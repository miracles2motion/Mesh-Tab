"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * HomeRootHistoryGuard
 * 
 * Enforces singleTop root destination architecture for MeshTab.
 * 
 * When the user is on the Home screen (/home):
 * - Traps history pops so that pressing the browser Back button will NEVER
 *   carry the user backwards into temporary sandbox/mode selectors (/demo),
 *   login screens, or dead session states.
 * - Keeps the user securely on /home without creating artificial history loops.
 */
export function HomeRootHistoryGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Push a root sentinel state so any Back click hits our interceptor
    // instead of popping backwards into /demo, /login, or previous screens
    if (!window.history.state?.isMeshTabHomeRoot) {
      window.history.pushState({ isMeshTabHomeRoot: true }, "", "/home");
    }

    const handlePopState = (e: PopStateEvent) => {
      // Absorb the pop and re-establish the /home root lock
      window.history.pushState({ isMeshTabHomeRoot: true }, "", "/home");
      
      const currentPath = window.location.pathname;
      if (currentPath !== "/home") {
        router.replace("/home");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  return null;
}
