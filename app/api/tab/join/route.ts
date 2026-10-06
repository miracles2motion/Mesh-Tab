import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

const joinTabSchema = z.object({
  joinCode: z.string().max(10), // e.g. 01ec74d6
  name: z.string().max(50),
  mode: z.enum(["clean", "demo", "testnet"]).default("clean"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
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

    const { joinCode, name, mode, walletAddress } = parsed.data;
    
    // Find the tab using the 8-character suffix code
    const keys = await redis.keys(`meshtab:${mode}:tab:*-${joinCode.toLowerCase()}`);
    
    if (keys.length === 0) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }
    
    const fullTabKey = keys[0]; // e.g. meshtab:testnet:tab:miami-trip-01ec74d6
    // Extract just the tabId part
    const prefixLength = `meshtab:${mode}:tab:`.length;
    const tabId = fullTabKey.substring(prefixLength);

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
