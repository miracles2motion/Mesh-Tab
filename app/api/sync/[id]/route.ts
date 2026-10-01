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
    
    // Namespace keys based on mode (demo vs testnet vs clean)
    const namespace = mode === "sample" ? "demo" : mode === "testnet" ? "testnet" : "clean";
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
    
    const namespace = mode === "sample" ? "demo" : mode === "testnet" ? "testnet" : "clean";
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
    
    let mergedExpenses = [...serverExpenses];
    
    // 2. Append-Only Smart Merge Expenses (Prevent History Rewriting)
    if (expenses && Array.isArray(expenses)) {
      expenses.forEach(e => {
        const idx = mergedExpenses.findIndex(se => se.id === e.id);
        if (idx === -1) {
          // Only allow appending new expenses
          mergedExpenses.push(e);
        }
      });
      pipeline.set(expensesKey, JSON.stringify(mergedExpenses), { ex: 60 * 60 * 24 });
    }
    
    // 3. Server-Side Deterministic Balance Recalculation
    if (members && Array.isArray(members)) {
      // Create a fresh list of members from the client's submitted roster
      // (This properly supports removing members with $0 balance)
      let calculatedMembers = members.map(m => ({ ...m, balance: 0, type: "settled" }));
      
      // Zero-sum mathematical pass over the immutable expense log
      mergedExpenses.forEach(exp => {
        const hasSplits = exp.splits && Object.keys(exp.splits).length > 0;
        const participatingMembers = hasSplits 
          ? calculatedMembers.filter(m => exp.splits && exp.splits[m.name] !== undefined && exp.splits[m.name] > 0)
          : exp.participants
            ? calculatedMembers.filter(m => exp.participants!.includes(m.name))
            : calculatedMembers;
        
        const splitCount = Math.max(1, participatingMembers.length);
        const baseShare = Math.floor(exp.amount / splitCount);
        let remainderPennies = exp.amount - (baseShare * splitCount);

        calculatedMembers.forEach(m => {
          let memberOwes = 0;
          if (hasSplits && exp.splits && exp.splits[m.name] !== undefined) {
            memberOwes = exp.splits[m.name];
          } else if (!hasSplits) {
            const isParticipant = exp.participants ? exp.participants.includes(m.name) : true;
            if (isParticipant) {
              const extraPenny = remainderPennies > 0 ? 1 : 0;
              if (remainderPennies > 0) remainderPennies--;
              memberOwes = baseShare + extraPenny;
            }
          }

          let delta = -memberOwes;
          if (m.name.toLowerCase() === exp.payer.toLowerCase()) {
            delta += exp.amount;
          }
          m.balance += delta;
        });
      });

      // Assign type tags based on server-verified mathematics
      calculatedMembers.forEach(m => {
        m.type = m.balance === 0 ? "settled" : m.balance > 0 ? "creditor" : "debtor";
      });

      pipeline.set(membersKey, JSON.stringify(calculatedMembers), { ex: 60 * 60 * 24 });
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
    
    const namespace = mode === "sample" ? "demo" : mode === "testnet" ? "testnet" : "clean";
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
