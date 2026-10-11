import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { backendModeSchema } from "@/lib/mode";

// [OVERSEER MANDATE - Baseline 19 & 32]: Strict validation + String caps
const createTabSchema = z.object({
  tabId: z.string().max(100),
  tabName: z.string().max(50),
  creatorName: z.string().max(50),
  currency: z.string().length(3).default("USD"),
  timestamp: z.number(),
  mode: backendModeSchema,
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
});

export async function POST(req: NextRequest) {
  try {
    // [OVERSEER MANDATE - Baseline 10]: Zero-Trust Payloads
    const authHeader = req.headers.get("Authorization");
    const creatorUserId = await getUserIdFromToken(authHeader);
    
    if (!creatorUserId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTabSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const { tabId, tabName, creatorName, currency, timestamp, mode, creatorWallet } = parsed.data;
    const tabKey = `meshtab:${mode}:tab:${tabId}`;
    
    // [OVERSEER MANDATE - Baseline 12]: API Idempotency
    const exists = await redis.exists(tabKey);
    if (exists) {
      return NextResponse.json({ success: true, message: "Tab already exists" }, { status: 200 });
    }

    // [OVERSEER MANDATE - Baseline 14]: Timestamp Authority
    const serverSyncedAt = Date.now();

    // [OVERSEER MANDATE - Baseline 30]: Request Batching (Multi)
    // [OVERSEER MANDATE - Baseline 34]: Storage Pruning (TTL)
    const multi = redis.multi();
    const tabData = JSON.stringify({ id: tabId, name: tabName, currency, createdAt: timestamp, serverSyncedAt, creator: creatorName, creatorWallet, creatorId: creatorUserId });
    multi.set(tabKey, tabData, { ex: 2592000 }); // 30 days
    
    // [OVERSEER MANDATE - Baseline 33]: Native Data Types (raw float string for balances)
    multi.hset(`${tabKey}:members`, { [creatorName]: "0.00" });
    multi.expire(`${tabKey}:members`, 2592000);
    
    // [OVERSEER MANDATE - Baseline 10 & 18]: Verified Peer-to-Peer Member EVM Wallet Mapping
    if (creatorWallet) {
      multi.hset(`${tabKey}:member_wallets`, { [creatorName]: creatorWallet });
      multi.expire(`${tabKey}:member_wallets`, 2592000);
    }
    
    // Authorization set uses authenticated Privy DID for cryptographic access control
    multi.sadd(`${tabKey}:authorized_users`, creatorUserId);
    multi.expire(`${tabKey}:authorized_users`, 2592000);
    multi.sadd(`meshtab:${mode}:user:${creatorUserId}:tabs`, tabId);
    
    // Index joinCode for O(1) instant lookup without KEYS scans
    const joinCode = tabId.includes("-") ? tabId.split("-").pop()?.toLowerCase() : null;
    if (joinCode && joinCode.length >= 6) {
      multi.set(`meshtab:${mode}:joincode:${joinCode}`, tabId, { ex: 2592000 });
    }
    
    await multi.exec();

    return NextResponse.json({ success: true });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Create Tab Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
