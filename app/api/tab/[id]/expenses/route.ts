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
    
    // Batch fetch members and expenses in one pipeline
    const pipeline = redis.pipeline();
    pipeline.lrange(`${tabKey}:expenses`, start, end);
    pipeline.hgetall(`${tabKey}:members`);
    const results = await pipeline.exec();
    
    const expensesRaw = results[0] as unknown[];
    const membersMap = results[1] as Record<string, string>;
    
    const expenses = expensesRaw.map(e => {
       try {
           return typeof e === 'string' ? JSON.parse(e) : e;
       } catch (err) {
           return null;
       }
    }).filter(e => e !== null);

    const members = Object.keys(membersMap || {}).map(name => ({
      name,
      balance: parseFloat(membersMap[name] || "0")
    }));

    return NextResponse.json({ 
      success: true, 
      expenses, 
      members,
      page, 
      hasMore: expenses.length === limit 
    });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Fetch Expenses Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
