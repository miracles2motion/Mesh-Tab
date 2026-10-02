import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

const joinTabSchema = z.object({
  tabId: z.string().max(100),
  name: z.string().max(50),
  mode: z.enum(["clean", "demo", "testnet"]).default("clean")
});

export async function POST(req: NextRequest) {
  try {
    // [OVERSEER MANDATE - Baseline 10]: Zero-Trust Payloads
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = joinTabSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const { tabId, name, mode } = parsed.data;
    
    const tabKey = `meshtab:${mode}:tab:${tabId}`;
    
    // Verify tab exists
    const exists = await redis.exists(tabKey);
    if (!exists) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    // Check if already a member
    const isMember = await redis.sismember(`${tabKey}:authorized_users`, walletAddress);
    if (isMember) {
       return NextResponse.json({ success: true, message: "Already a member" });
    }
    
    const multi = redis.multi();
    // [OVERSEER MANDATE - Baseline 33]: Native Data Types (raw float string)
    multi.hset(`${tabKey}:members`, { [name]: "0.00" });
    multi.sadd(`${tabKey}:authorized_users`, walletAddress);
    
    // [OVERSEER MANDATE - Baseline 34]: Storage Pruning (TTL refresh)
    multi.expire(`${tabKey}:members`, 2592000); // 30 days
    multi.expire(`${tabKey}:authorized_users`, 2592000);
    multi.expire(tabKey, 2592000);
    
    multi.sadd(`meshtab:${mode}:user:${walletAddress}:tabs`, tabId);
    
    await multi.exec();

    return NextResponse.json({ success: true });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Join Tab Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
