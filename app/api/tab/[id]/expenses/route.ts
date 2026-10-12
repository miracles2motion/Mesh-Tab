import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { normalizeBackendMode } from "@/lib/mode";

// [OVERSEER MANDATE - Baseline 20]: Next.js Route Caching
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // [OVERSEER MANDATE - Baseline 10]: Extract walletAddress from Auth
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const mode = normalizeBackendMode(req.nextUrl.searchParams.get("mode"));
    
    // [OVERSEER MANDATE - Baseline 10]: verify they are a member of the tab before returning data
    const tabKey = `meshtab:${mode}:tab:${id}`;
    const isMember = await redis.sismember(`${tabKey}:authorized_users`, walletAddress);
    
    if (!isMember) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // [OVERSEER MANDATE - Baseline 26]: Infinite List Bloat Protection (Pagination)
    const pageStr = req.nextUrl.searchParams.get("page") || "0";
    const page = parseInt(pageStr, 10);
    const limit = 100;
    const start = page * limit;
    const end = start + limit - 1;
    
    // Auto-heal member wallet and profile in Redis whenever an authenticated tab member connects
    const callerWallet = req.headers.get("x-wallet-address") || req.nextUrl.searchParams.get("wallet");
    const callerName = req.headers.get("x-user-name") || req.nextUrl.searchParams.get("name");

    if (callerWallet && /^0x[a-fA-F0-9]{40}$/i.test(callerWallet)) {
      const cleanWallet = callerWallet.toLowerCase();
      if (callerName) {
        await redis.hset(`${tabKey}:member_wallets`, { [callerName]: callerWallet });
        const rawExisting = await redis.get(`user:${cleanWallet}`);
        const existing = rawExisting ? (typeof rawExisting === "string" ? JSON.parse(rawExisting) : rawExisting) : {};
        await redis.set(`user:${cleanWallet}`, JSON.stringify({
          ...existing,
          name: callerName || existing.name || "User",
          avatarColorIndex: existing.avatarColorIndex ?? 0,
          developerMode: existing.developerMode ?? false,
          buddySettings: existing.buddySettings || undefined,
          lastUpdated: existing.lastUpdated || Date.now()
        }));
        await redis.sadd(`meshtab:${mode}:user:${cleanWallet}:tabs`, id);
      }
      const rawExistingAuth = await redis.get(`user:${walletAddress}`);
      const existingAuth = rawExistingAuth ? (typeof rawExistingAuth === "string" ? JSON.parse(rawExistingAuth) : rawExistingAuth) : {};
      await redis.set(`user:${walletAddress}`, JSON.stringify({
        ...existingAuth,
        name: callerName || existingAuth.name || "",
        wallet: callerWallet || existingAuth.wallet,
        avatarColorIndex: existingAuth.avatarColorIndex ?? 0,
        developerMode: existingAuth.developerMode ?? false,
        buddySettings: existingAuth.buddySettings || undefined,
        lastUpdated: existingAuth.lastUpdated || Date.now()
      }));
      await redis.sadd(`meshtab:${mode}:user:${walletAddress}:tabs`, id);
    }

    // Batch fetch members, wallets, legacy expenses, new expense IDs, tab metadata, and activity in one pipeline
    const pipeline = redis.pipeline();
    pipeline.lrange(`${tabKey}:expenses`, start, end); // Legacy list
    pipeline.zrange(`${tabKey}:expenses_zset`, start, end, { rev: true }); // New zset
    pipeline.hgetall(`${tabKey}:members`);
    pipeline.hgetall(`${tabKey}:member_wallets`);
    pipeline.get(tabKey); // Tab metadata (creator, currency, etc.)
    pipeline.lrange(`${tabKey}:activity`, 0, 19); // Recent tab activity & notifications
    const results = await pipeline.exec();
    
    const legacyExpensesRaw = results[0] as unknown[];
    const newExpenseIds = results[1] as string[];
    const membersMap = results[2] as Record<string, string>;
    const memberWalletsMap = ((results[3] || {}) as Record<string, string>);
    if (callerWallet && callerName) {
      memberWalletsMap[callerName] = callerWallet;
    }
    const tabMetaRaw = results[4];
    const activityRaw = (results[5] || []) as unknown[];
    let tabMeta: any = null;
    try {
      tabMeta = typeof tabMetaRaw === 'string' ? JSON.parse(tabMetaRaw) : tabMetaRaw;
    } catch {}
    const creatorName = tabMeta?.creator || "";
    
    // Fetch new expenses from hash
    let newExpensesRaw: unknown[] = [];
    if (newExpenseIds && newExpenseIds.length > 0) {
      const hmres = await redis.hmget(`${tabKey}:expenses_hash`, ...newExpenseIds);
      if (hmres && typeof hmres === 'object') {
        newExpensesRaw = Object.values(hmres);
      } else if (Array.isArray(hmres)) {
        newExpensesRaw = hmres;
      }
    }
    
    // Parse and merge
    const parsedLegacy = legacyExpensesRaw.map(e => {
       try { return typeof e === 'string' ? JSON.parse(e) : e; } catch (err) { return null; }
    }).filter(e => e !== null);
    
    const parsedNew = newExpensesRaw.map(e => {
       try { return typeof e === 'string' ? JSON.parse(e) : e; } catch (err) { return null; }
    }).filter(e => e !== null);

    // Merge and deduplicate by expenseId (new hash takes precedence over legacy)
    const expensesMap = new Map<string, any>();
    const deletedIds: string[] = [];

    for (const exp of parsedLegacy) {
      if (exp && exp.expenseId) {
        if (exp.deletedAt) {
          deletedIds.push(exp.expenseId);
        } else {
          expensesMap.set(exp.expenseId, exp);
        }
      }
    }
    for (const exp of parsedNew) {
      if (exp && exp.expenseId) {
        if (exp.deletedAt) {
          deletedIds.push(exp.expenseId);
          expensesMap.delete(exp.expenseId);
        } else {
          expensesMap.set(exp.expenseId, exp);
        }
      }
    }
    
    const expenses = Array.from(expensesMap.values());
    
    // Sort combined expenses newest-first
    const getExpTs = (e: any): number => {
      if (!e) return 0;
      if (typeof e.serverSyncedAt === "number" && !isNaN(e.serverSyncedAt) && e.serverSyncedAt > 0) return e.serverSyncedAt;
      if (typeof e.timestamp === "number" && !isNaN(e.timestamp) && e.timestamp > 0) return e.timestamp;
      if (typeof e.createdAt === "number" && !isNaN(e.createdAt) && e.createdAt > 0) return e.createdAt;
      for (const v of [e.serverSyncedAt, e.timestamp, e.createdAt]) {
        if (typeof v === "string" && v.trim()) {
          const num = Number(v);
          if (!isNaN(num) && num > 100000000000) return num;
          const parsed = Date.parse(v);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
      if (typeof e.expenseId === "string") {
        const rawId = e.expenseId.replace(/^[a-zA-Z_-]+/, "");
        const numId = Number(rawId);
        if (!isNaN(numId) && numId > 100000000000) return numId;
      }
      return 0;
    };

    expenses.sort((a, b) => {
      const tsB = getExpTs(b);
      const tsA = getExpTs(a);
      if (tsB !== tsA) return tsB - tsA;
      return String(b.expenseId || "").localeCompare(String(a.expenseId || ""));
    });

    const members = Object.keys(membersMap || {}).map(name => ({
      name,
      balance: parseFloat(membersMap[name] || "0"),
      walletAddress: memberWalletsMap[name] || undefined,
      role: (creatorName && name.toLowerCase() === creatorName.toLowerCase()) ? "admin" : "member"
    }));

    return NextResponse.json({ 
      success: true, 
      expenses, 
      deletedIds,
      members,
      creator: creatorName,
      activity: activityRaw,
      page, 
      hasMore: (parsedLegacy.length === limit) || (parsedNew.length === limit)
    });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Fetch Expenses Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
