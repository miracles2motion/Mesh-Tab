import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

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
    const mode = req.nextUrl.searchParams.get("mode") || "clean";
    
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
    
    // Batch fetch members, legacy expenses, and new expense IDs in one pipeline
    const pipeline = redis.pipeline();
    pipeline.lrange(`${tabKey}:expenses`, start, end); // Legacy list
    pipeline.zrange(`${tabKey}:expenses_zset`, start, end, { rev: true }); // New zset
    pipeline.hgetall(`${tabKey}:members`);
    const results = await pipeline.exec();
    
    const legacyExpensesRaw = results[0] as unknown[];
    const newExpenseIds = results[1] as string[];
    const membersMap = results[2] as Record<string, string>;
    
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
    for (const exp of parsedLegacy) {
      if (exp && exp.expenseId) expensesMap.set(exp.expenseId, exp);
    }
    for (const exp of parsedNew) {
      if (exp && exp.expenseId) expensesMap.set(exp.expenseId, exp);
    }
    
    const expenses = Array.from(expensesMap.values());
    
    // Sort combined expenses by serverSyncedAt descending
    expenses.sort((a, b) => (b.serverSyncedAt || 0) - (a.serverSyncedAt || 0));

    const members = Object.keys(membersMap || {}).map(name => ({
      name,
      balance: parseFloat(membersMap[name] || "0")
    }));

    return NextResponse.json({ 
      success: true, 
      expenses, 
      members,
      page, 
      hasMore: (parsedLegacy.length === limit) || (parsedNew.length === limit)
    });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Fetch Expenses Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
