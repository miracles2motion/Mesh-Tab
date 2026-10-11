import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { backendModeSchema } from "@/lib/mode";

const joinTabSchema = z.object({
  joinCode: z.string().max(10).optional(),
  tabId: z.string().max(100).optional(),
  name: z.string().max(50),
  mode: backendModeSchema,
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
       // [OVERSEER MANDATE - Baseline 12]: Idempotent refresh of member wallet mapping and profile
       if (walletAddress) {
         await redis.hset(`${fullTabKey}:member_wallets`, { [name]: walletAddress });
         const rawExisting = await redis.get(`user:${walletAddress.toLowerCase()}`);
         const existing = rawExisting ? (typeof rawExisting === "string" ? JSON.parse(rawExisting) : rawExisting) : {};
         await redis.set(`user:${walletAddress.toLowerCase()}`, JSON.stringify({
           ...existing,
           name: name || existing.name || "User",
           avatarColorIndex: existing.avatarColorIndex ?? 0,
           developerMode: existing.developerMode ?? false,
           buddySettings: existing.buddySettings || undefined,
           lastUpdated: existing.lastUpdated || Date.now()
         }));
       }
       const rawExistingUser = await redis.get(`user:${userId}`);
       const existingUser = rawExistingUser ? (typeof rawExistingUser === "string" ? JSON.parse(rawExistingUser) : rawExistingUser) : {};
       await redis.set(`user:${userId}`, JSON.stringify({
         ...existingUser,
         name: name || existingUser.name || "User",
         wallet: walletAddress || existingUser.wallet || "",
         avatarColorIndex: existingUser.avatarColorIndex ?? 0,
         developerMode: existingUser.developerMode ?? false,
         buddySettings: existingUser.buddySettings || undefined,
         lastUpdated: existingUser.lastUpdated || Date.now()
       }));
       return NextResponse.json({ success: true, message: "Already a member", tabId });
    }

    // [OVERSEER MANDATE - Member Capacity]: Check 20-member cap to guarantee instant sub-second netting velocity
    const currentMemberCount = await redis.hlen(`${fullTabKey}:members`);
    if (currentMemberCount >= 20) {
      return NextResponse.json({
        success: false,
        error: "This tab has reached the maximum capacity of 20 members. To ensure instant settlement speed, additional members cannot join."
      }, { status: 400 });
    }

    // Read tab metadata for authentic notification naming
    const tabRaw = await redis.get(fullTabKey);
    let tabData: any = null;
    try {
      tabData = typeof tabRaw === "string" ? JSON.parse(tabRaw) : tabRaw;
    } catch {}
    const tabName = tabData?.name || "Group Space";
    
    // Read existing profile to merge non-destructively
    let existingProfileWallet: any = {};
    if (walletAddress) {
      const rawW = await redis.get(`user:${walletAddress.toLowerCase()}`);
      if (rawW) existingProfileWallet = typeof rawW === "string" ? JSON.parse(rawW) : rawW;
    }
    let existingProfileUser: any = {};
    const rawU = await redis.get(`user:${userId}`);
    if (rawU) existingProfileUser = typeof rawU === "string" ? JSON.parse(rawU) : rawU;

    const multi = redis.multi();
    // [OVERSEER MANDATE - Baseline 33]: Native Data Types (raw float string)
    multi.hset(`${fullTabKey}:members`, { [name]: "0.00" });
    // [OVERSEER MANDATE - Baseline 10 & 18]: Verified Peer-to-Peer Member EVM Wallet Mapping
    if (walletAddress) {
      multi.hset(`${fullTabKey}:member_wallets`, { [name]: walletAddress });
      multi.expire(`${fullTabKey}:member_wallets`, 2592000);
      multi.set(`user:${walletAddress.toLowerCase()}`, JSON.stringify({
        ...existingProfileWallet,
        name: name || existingProfileWallet.name || "User",
        avatarColorIndex: existingProfileWallet.avatarColorIndex ?? 0,
        developerMode: existingProfileWallet.developerMode ?? false,
        buddySettings: existingProfileWallet.buddySettings || undefined,
        lastUpdated: existingProfileWallet.lastUpdated || Date.now()
      }));
    }
    // Also save profile indexed by Privy DID so lookup never fails
    multi.set(`user:${userId}`, JSON.stringify({
      ...existingProfileUser,
      name: name || existingProfileUser.name || "User",
      wallet: walletAddress || existingProfileUser.wallet || "",
      avatarColorIndex: existingProfileUser.avatarColorIndex ?? 0,
      developerMode: existingProfileUser.developerMode ?? false,
      buddySettings: existingProfileUser.buddySettings || undefined,
      lastUpdated: existingProfileUser.lastUpdated || Date.now()
    }));

    multi.sadd(`${fullTabKey}:authorized_users`, userId);

    // Record verified peer join activity in Redis for all tab members
    const joinActivity = JSON.stringify({
      id: `notif-join-${tabId}-${name.toLowerCase().replace(/\s+/g, "_")}`,
      type: "tab_created",
      title: "New Member Joined",
      desc: `${name} joined "${tabName}" via passkey.`,
      actor: name,
      tabId,
      tabName,
      timestamp: Date.now(),
      link: `/tab/${tabId}`
    });
    multi.lpush(`${fullTabKey}:activity`, joinActivity);
    multi.ltrim(`${fullTabKey}:activity`, 0, 49);
    multi.expire(`${fullTabKey}:activity`, 2592000);
    
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
