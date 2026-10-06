import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

const joinTabSchema = z.object({
  joinCode: z.string().max(10).optional(),
  tabId: z.string().max(100).optional(),
  name: z.string().max(50),
  mode: z.enum(["clean", "demo", "testnet"]).default("clean"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
}).refine(data => Boolean(data.joinCode || data.tabId), {
  message: "Either joinCode or tabId must be provided"
});

export async function POST(req: NextRequest) {
  try {
    // [OVERSEER MANDATE - Baseline 10]: Zero-Trust Payloads
    const authHeader = req.headers.get("Authorization");
    const userId = await getUserIdFromToken(authHeader);
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = joinTabSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const { joinCode, tabId: inputTabId, name, mode, walletAddress } = parsed.data;
    let resolvedTabId: string | null = null;

    // 1. Direct O(1) resolution if tabId is passed (e.g. from invite link)
    if (inputTabId) {
      const exists = await redis.exists(`meshtab:${mode}:tab:${inputTabId}`);
      if (exists) {
        resolvedTabId = inputTabId;
      }
    }

    // 2. O(1) indexed lookup if joinCode is passed
    if (!resolvedTabId && joinCode) {
      const indexed = await redis.get(`meshtab:${mode}:joincode:${joinCode.toLowerCase()}`);
      if (indexed && typeof indexed === "string") {
        resolvedTabId = indexed;
      } else {
        // Fallback scan for backwards compatibility with legacy tabs
        const keys = await redis.keys(`meshtab:${mode}:tab:*-${joinCode.toLowerCase()}`);
        if (keys.length > 0) {
          const prefixLength = `meshtab:${mode}:tab:`.length;
          resolvedTabId = keys[0].substring(prefixLength);
        }
      }
    }

    if (!resolvedTabId) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const tabId = resolvedTabId;
    const fullTabKey = `meshtab:${mode}:tab:${tabId}`;

    // Check if already a member
    const isMember = await redis.sismember(`${fullTabKey}:authorized_users`, userId);
    if (isMember) {
       // [OVERSEER MANDATE - Baseline 12]: Idempotent refresh of member wallet mapping
       if (walletAddress) {
         await redis.hset(`${fullTabKey}:member_wallets`, { [name]: walletAddress });
       }
       return NextResponse.json({ success: true, message: "Already a member", tabId });
    }
    
    const multi = redis.multi();
    // [OVERSEER MANDATE - Baseline 33]: Native Data Types (raw float string)
    multi.hset(`${fullTabKey}:members`, { [name]: "0.00" });
    // [OVERSEER MANDATE - Baseline 10 & 18]: Verified Peer-to-Peer Member EVM Wallet Mapping
    if (walletAddress) {
      multi.hset(`${fullTabKey}:member_wallets`, { [name]: walletAddress });
      multi.expire(`${fullTabKey}:member_wallets`, 2592000);
    }
    multi.sadd(`${fullTabKey}:authorized_users`, userId);
    
    // [OVERSEER MANDATE - Baseline 34]: Storage Pruning (TTL refresh)
    multi.expire(`${fullTabKey}:members`, 2592000); // 30 days
    multi.expire(`${fullTabKey}:authorized_users`, 2592000);
    multi.expire(fullTabKey, 2592000);
    
    multi.sadd(`meshtab:${mode}:user:${userId}:tabs`, tabId);
    
    await multi.exec();

    return NextResponse.json({ success: true, tabId });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Join Tab Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
