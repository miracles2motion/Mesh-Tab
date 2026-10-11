import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { LUA_ADD_EXPENSE } from "@/lib/redis-scripts";
import { backendModeSchema } from "@/lib/mode";

export const dynamic = "force-dynamic";

const settleDebtSchema = z.object({
  settleId: z.string().max(100),
  payer: z.string().max(50),
  amount: z.number().positive(),
  creditors: z.array(z.object({
    name: z.string().max(50),
    amount: z.number().positive()
  })),
  mode: backendModeSchema,
  description: z.string().max(100).default("Settled balance in AUSD (Monad)"),
  txHash: z.string().optional(),
  timestamp: z.number().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    const parsed = settleDebtSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const payload = parsed.data;
    const tabKey = `meshtab:${payload.mode}:tab:${id}`;

    const isMember = await redis.sismember(`${tabKey}:authorized_users`, walletAddress);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const serverSyncedAt = Date.now();
    const expenseRecord = {
      expenseId: payload.settleId,
      description: payload.description,
      finalAmountUsd: payload.amount,
      originalAmount: payload.amount,
      originalCurrency: "USD",
      timestamp: payload.timestamp || serverSyncedAt,
      isSettlement: true,
      txHash: payload.txHash,
      payers: [{ name: payload.payer, amount: payload.amount }],
      borrowers: payload.creditors.map(c => ({ name: c.name, amount: c.amount })),
      serverSyncedAt
    };

    // Construct deltas: Debtor balance increases by +amount, creditors' balance decreases by -deduct
    const splitDetails = [
      { name: payload.payer, delta: payload.amount.toString() },
      ...payload.creditors.map(c => ({ name: c.name, delta: (-c.amount).toString() }))
    ];

    const expenseHashKey = `${tabKey}:expenses_hash`;
    const expenseZsetKey = `${tabKey}:expenses_zset`;
    const membersKey = `${tabKey}:members`;

    const result = await redis.eval(
      LUA_ADD_EXPENSE,
      [expenseHashKey, expenseZsetKey, membersKey, tabKey],
      [
        payload.settleId,
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

    // Record settlement notification & activity in tab feed
    const creditorNames = payload.creditors.map(c => c.name).join(", ");
    const settleActivity = JSON.stringify({
      id: `act-${payload.settleId}`,
      type: "expense_added",
      title: "Debt Settled On-Chain",
      desc: `${payload.payer} settled $${(payload.amount / 100).toFixed(2)} with ${creditorNames} in Agora AUSD on Monad.`,
      actor: payload.payer,
      tabId: id,
      timestamp: serverSyncedAt,
      link: `/tab/${id}`,
      txHash: payload.txHash
    });
    await redis.lpush(`${tabKey}:activity`, settleActivity);
    await redis.ltrim(`${tabKey}:activity`, 0, 49);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settle Debt Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
