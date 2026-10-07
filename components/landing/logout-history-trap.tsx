"use client";

import { useEffect } from "react";

/**
 * LogoutHistoryTrap
 * 
 * When a user explicitly logs out via the Settings "Log Out" button:
 * - They are redirected to the landing page ("/").
 * - This trap neutralizes the browser Back button by pushing the landing page state
 *   and intercepting popstate events so pressing Back keeps the user firmly on "/".
 * - When they navigate explicitly (e.g. click "Explore Testnet" or "Open Demo"),
 *   the trap flags are cleared.
 */
export function LogoutHistoryTrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const justLoggedOut = sessionStorage.getItem("mesh_just_logged_out") === "true";
    const explicitLogout = localStorage.getItem("mesh_explicit_logout") === "true";

    if (justLoggedOut || explicitLogout) {
      // Push state immediately so back button cannot transition to prior page
      window.history.pushState(null, "", window.location.href);

      const handlePopState = () => {
        // Intercept back button and hold user firmly on the landing page
        window.history.pushState(null, "", window.location.href);
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, []);

  return null;
}
