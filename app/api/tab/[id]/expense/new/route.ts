import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

// [OVERSEER MANDATE - Baseline 19 & 32]: Strict validation + String caps
const createExpenseSchema = z.object({
  expenseId: z.string().max(100),
  description: z.string().max(100),
  originalAmount: z.number(),
  originalCurrency: z.string().length(3).default("USD"),
  finalAmountUsd: z.number(),
  timestamp: z.number(),
  mode: z.enum(["clean", "demo", "testnet"]).default("clean"),
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

    // [OVERSEER MANDATE - Baseline 27]: Atomic Transaction Blocks
    const multi = redis.multi();
    
    // [OVERSEER MANDATE - Baseline 14]: Timestamp Authority
    const expenseRecord = {
       ...payload,
       serverSyncedAt: Date.now()
    };
    
    // [OVERSEER MANDATE - Baseline 13]: Append-Only
    multi.rpush(`${tabKey}:expenses`, JSON.stringify(expenseRecord));
    
    // [OVERSEER MANDATE - Baseline 26]: Infinite List Bloat Protection
    multi.ltrim(`${tabKey}:expenses`, -5000, -1);
    
    // [OVERSEER MANDATE - Baseline 33]: Native Data Types / HINCRBY
    for (const payer of payload.payers) {
       multi.hincrbyfloat(`${tabKey}:members`, payer.name, payer.amount);
    }
    for (const borrower of payload.borrowers) {
       multi.hincrbyfloat(`${tabKey}:members`, borrower.name, -borrower.amount);
    }
    
    // [OVERSEER MANDATE - Baseline 34]: Storage Pruning (TTL refresh)
    multi.expire(`${tabKey}:members`, 2592000); // 30 days
    multi.expire(`${tabKey}:authorized_users`, 2592000);
    multi.expire(tabKey, 2592000);
    
    await multi.exec();

    return NextResponse.json({ success: true });
    
  } catch (error) {
    // [OVERSEER MANDATE - Baseline 22]: Backend Error Serialization
    console.error("Create Expense Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
