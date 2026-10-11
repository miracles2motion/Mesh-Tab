import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

// [OVERSEER MANDATE - Baseline 20]: Next.js Route Caching.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // [OVERSEER MANDATE - Baseline 10]: Extract walletAddress from Auth
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get("mode") || "clean";

    const tabIds = await redis.smembers(`meshtab:${mode}:user:${walletAddress}:tabs`);
    console.log(`[SYNC DEBUG] User ${walletAddress} requested tabs for mode ${mode}. Found ${tabIds?.length || 0} tabs.`);
    
    if (!tabIds || tabIds.length === 0) {
      return NextResponse.json({ success: true, tabs: [] });
    }

    const tabKeys = tabIds.map(id => `meshtab:${mode}:tab:${id}`);
    
    // [OVERSEER MANDATE - Baseline 31]: Multi-Get Vectorization (O(1) Fetching)
    // We also pipeline the member hashes to do everything in exactly 2 requests!
    // Request 1: smembers
    // Request 2: mget + pipeline of hgetall
    
    const pipeline = redis.pipeline();
    pipeline.mget(...tabKeys);
    tabIds.forEach(id => {
       pipeline.hgetall(`meshtab:${mode}:tab:${id}:members`);
       pipeline.hgetall(`meshtab:${mode}:tab:${id}:member_wallets`);
       pipeline.lrange(`meshtab:${mode}:tab:${id}:activity`, 0, 10);
    });
    
    const results = await pipeline.exec();
    
    // results[0] is the result of mget -> array of strings/nulls
    const rawTabs = results[0] as (string | null)[];

    const tabs = [];
    
    for (let i = 0; i < tabIds.length; i++) {
      const rawTab = rawTabs[i];
      if (!rawTab) {
        // Self-heal: tab was deleted, remove stale ID from user's set
        redis.srem(`meshtab:${mode}:user:${walletAddress}:tabs`, tabIds[i]).catch(() => {});
        continue;
      }
      
      try {
        const tabData = typeof rawTab === "string" ? JSON.parse(rawTab) : rawTab;
        
        // [OVERSEER MANDATE - Baseline 33]: Native Data Types parsing
        const membersMap = (results[1 + i * 3] || {}) as Record<string, string>;
        const memberWallets = (results[1 + i * 3 + 1] || {}) as Record<string, string>;
        const activityRaw = (results[1 + i * 3 + 2] || []) as unknown[];
        
        // Parse float balances and attach member wallet addresses
        const members = Object.keys(membersMap).map(name => ({
          name,
          balance: parseFloat(String(membersMap[name] ?? "0")),
          walletAddress: memberWallets[name] || undefined
        }));
        
        // Calculate total balance of the tab (sum of positive balances)
        const totalBalance = members.reduce((sum, m) => sum + (m.balance > 0 ? m.balance : 0), 0);
        
        const isCreator = Boolean(
          (tabData.creatorId && tabData.creatorId === walletAddress) ||
          (tabData.creatorWallet && tabData.creatorWallet.toLowerCase() === walletAddress.toLowerCase())
        );

        tabs.push({
          ...tabData,
          members,
          totalBalance,
          isCreator,
          role: isCreator ? "Creator" : "Member",
          activity: activityRaw
        });
      } catch (err) {
        console.error("Failed to parse tab JSON", err);
      }
    }

    // [OVERSEER MANDATE - Baseline 18]: Identity Normalization
    // Ideally, we fetch profiles here, but for now we return raw addresses 
    // and the UI handles avatar resolution, or we pipeline profile fetches.
    // For free tier optimization, the frontend client will cache/resolve profiles.

    return NextResponse.json({ success: true, tabs });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Fetch Tabs Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
