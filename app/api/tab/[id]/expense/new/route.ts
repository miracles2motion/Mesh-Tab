import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { LUA_ADD_EXPENSE } from "@/lib/redis-scripts";
import { backendModeSchema } from "@/lib/mode";

const createExpenseSchema = z.object({
  expenseId: z.string().max(100),
  description: z.string().max(100),
  originalAmount: z.number(),
  originalCurrency: z.string().length(3).default("USD"),
  finalAmountUsd: z.number(),
  timestamp: z.number(),
  mode: backendModeSchema,
  payers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  borrowers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  metadata: z.any().optional() // Preserve UI state (category, splits, etc)
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // [OVERSEER MANDATE - Baseline 10]: Zero-Trust Payloads
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    const parsed = createExpenseSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const payload = parsed.data;
    const tabKey = `meshtab:${payload.mode}:tab:${id}`;

    // [OVERSEER MANDATE - Baseline 29]: Authorization Verification (Ghost Writes)
    const isMember = await redis.sismember(`${tabKey}:authorized_users`, walletAddress);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // [OVERSEER MANDATE - Baseline 14]: Timestamp Authority
    const serverSyncedAt = Date.now();
    const expenseRecord = {
       ...payload,
       serverSyncedAt
    };
    
    // Compute split details for Lua
    const splitMap = new Map<string, number>();
    for (const payer of payload.payers) {
      splitMap.set(payer.name, (splitMap.get(payer.name) || 0) + payer.amount);
    }
    for (const borrower of payload.borrowers) {
      splitMap.set(borrower.name, (splitMap.get(borrower.name) || 0) - borrower.amount);
    }
    const splitDetails = Array.from(splitMap.entries()).map(([name, delta]) => ({ name, delta: delta.toString() }));

    const expenseHashKey = `${tabKey}:expenses_hash`;
    const expenseZsetKey = `${tabKey}:expenses_zset`;
    const membersKey = `${tabKey}:members`;

    // [OVERSEER MANDATE - Baseline 12, 27]: Idempotency & Atomic Blocks
    const result = await redis.eval(
      LUA_ADD_EXPENSE,
      [expenseHashKey, expenseZsetKey, membersKey, tabKey],
      [
        payload.expenseId,
        serverSyncedAt.toString(),
        JSON.stringify(expenseRecord),
        "",
        "",
        JSON.stringify(splitDetails)
      ]
    ) as [number, string];

    if (result[0] === 0 && result[1] === "alreadyApplied") {
      return NextResponse.json({ success: true, alreadyApplied: true });
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Create Expense Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
