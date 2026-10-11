import { z } from "zod";

export type BackendMode = "clean" | "demo" | "testnet";

/**
 * Normalizes client mode strings to canonical Redis partition modes.
 * Maps:
 * - "testnet" -> "testnet"
 * - "demo" | "sample" -> "demo"
 * - "clean" | "blank" | other -> "clean"
 */
export function normalizeBackendMode(raw: unknown): BackendMode {
  if (raw === "testnet") return "testnet";
  if (raw === "demo" || raw === "sample") return "demo";
  return "clean";
}

/**
 * Zod schema that preprocesses client mode strings to valid BackendMode.
 * Defaults to "clean" if missing or invalid.
 */
export const backendModeSchema = z.preprocess(
  (val) => normalizeBackendMode(val),
  z.enum(["clean", "demo", "testnet"]).default("clean")
);
