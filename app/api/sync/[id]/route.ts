import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mode = req.nextUrl.searchParams.get("mode") || "blank";
    
    // Namespace keys based on mode (demo vs testnet/blank)
    const namespace = mode === "sample" ? "demo" : "clean";
    const membersKey = `meshtab:${namespace}:members:${id}`;
    const expensesKey = `meshtab:${namespace}:expenses:${id}`;

    // Use pipeline to fetch both in one network request for speed
    const pipeline = redis.pipeline();
    pipeline.get(membersKey);
    pipeline.get(expensesKey);
    
    const [membersStr, expensesStr] = await pipeline.exec();
    
    // Parse if exists, else return empty arrays
    const members = typeof membersStr === "string" ? JSON.parse(membersStr) : membersStr || [];
    const expenses = typeof expensesStr === "string" ? JSON.parse(expensesStr) : expensesStr || [];

    return NextResponse.json({ members, expenses });
  } catch (error) {
    console.error("Redis Sync GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch tab data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { mode = "blank", members, expenses } = body;
    
    const namespace = mode === "sample" ? "demo" : "clean";
    const membersKey = `meshtab:${namespace}:members:${id}`;
    const expensesKey = `meshtab:${namespace}:expenses:${id}`;

    // 1. Fetch current server state to prevent race conditions
    const [serverMembersStr, serverExpensesStr] = await Promise.all([
      redis.get(membersKey),
      redis.get(expensesKey)
    ]);

    const serverMembers: any[] = typeof serverMembersStr === "string" ? JSON.parse(serverMembersStr) : serverMembersStr || [];
    const serverExpenses: any[] = typeof serverExpensesStr === "string" ? JSON.parse(serverExpensesStr) : serverExpensesStr || [];

    const pipeline = redis.pipeline();
    
    // 2. Smart Merge Members (by Name)
    if (members && Array.isArray(members)) {
      const mergedMembers = [...serverMembers];
      members.forEach(m => {
        const idx = mergedMembers.findIndex(sm => sm.name.toLowerCase() === m.name.toLowerCase());
        if (idx === -1) {
          mergedMembers.push(m);
        } else {
          // If already exists, client's balance calculation takes precedence 
          mergedMembers[idx] = { ...mergedMembers[idx], ...m };
        }
      });
      pipeline.set(membersKey, JSON.stringify(mergedMembers), { ex: 60 * 60 * 24 });
    }
    
    // 3. Smart Merge Expenses (by ID)
    if (expenses && Array.isArray(expenses)) {
      const mergedExpenses = [...serverExpenses];
      expenses.forEach(e => {
        if (!mergedExpenses.some(se => se.id === e.id)) {
          mergedExpenses.push(e);
        }
      });
      // Sort by time or leave as is (assume newer items are appended or prepended correctly)
      pipeline.set(expensesKey, JSON.stringify(mergedExpenses), { ex: 60 * 60 * 24 });
    }
    
    await pipeline.exec();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redis Sync POST Error:", error);
    return NextResponse.json({ error: "Failed to sync tab data" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mode = req.nextUrl.searchParams.get("mode") || "blank";
    
    const namespace = mode === "sample" ? "demo" : "clean";
    const membersKey = `meshtab:${namespace}:members:${id}`;
    const expensesKey = `meshtab:${namespace}:expenses:${id}`;

    const pipeline = redis.pipeline();
    pipeline.del(membersKey);
    pipeline.del(expensesKey);
    
    await pipeline.exec();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Redis Sync DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete tab data" }, { status: 500 });
  }
}
