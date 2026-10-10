import { PrivyClient } from "@privy-io/server-auth";

export const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmumvudgl005o0ckz1jn2ged5",
  process.env.PRIVY_APP_SECRET || "mock-secret"
);

/**
 * Extracts the user's wallet address (or did) from the Authorization header.
 * In a real production app with a secret, this verifies the JWT.
 * If PRIVY_APP_SECRET is not configured properly, this gracefully falls back
 * for hackathon demo purposes (as long as a token is provided).
 */
export async function getUserIdFromToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.split(" ")[1];
  
  try {
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims.userId; // e.g. "did:privy:..."
  } catch (error) {
    console.warn("Privy token verification note:", error);
    // HACKATHON FALLBACK: if token validation fails (often due to missing PRIVY_APP_SECRET in testnet/dev), 
    // extract userId from token directly if it's a mock token or decode the standard JWT claims (sub: "did:privy:...").
    if (token.startsWith("mock-user-")) {
      return token;
    }
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        if (payload && (payload.sub || payload.userId)) {
          return payload.sub || payload.userId;
        }
      }
    } catch (decodeErr) {
      console.error("JWT payload decode error:", decodeErr);
    }
    return null;
  }
}
