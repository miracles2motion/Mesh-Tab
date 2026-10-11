import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { LUA_EDIT_EXPENSE, LUA_DELETE_EXPENSE } from "@/lib/redis-scripts";
import { backendModeSchema } from "@/lib/mode";

const editExpenseSchema = z.object({
  description: z.string().max(100),
  finalAmountUsd: z.number(),
  mode: backendModeSchema,
  payers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  borrowers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  oldPayers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  oldBorrowers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  editedBy: z.string().max(50),
  metadata: z.any().optional()
});

const deleteExpenseSchema = z.object({
  mode: backendModeSchema,
  oldPayers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  oldBorrowers: z.array(z.object({
    name: z.string().max(50),
    amount: z.number()
  })),
  deletedBy: z.string().max(50)
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string, expenseId: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id, expenseId } = await params;
    const body = await req.json();
    
    const parsed = editExpenseSchema.safeParse(body);
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
       expenseId,
       ...payload,
       updatedAt: serverSyncedAt
    };
    
    const newSplitMap = new Map<string, number>();
    for (const p of payload.payers) newSplitMap.set(p.name, (newSplitMap.get(p.name) || 0) + p.amount);
    for (const b of payload.borrowers) newSplitMap.set(b.name, (newSplitMap.get(b.name) || 0) - b.amount);
    const newSplitDetails = Array.from(newSplitMap.entries()).map(([name, delta]) => ({ name, delta: delta.toString() }));

    const oldSplitMap = new Map<string, number>();
    for (const p of payload.oldPayers) oldSplitMap.set(p.name, (oldSplitMap.get(p.name) || 0) + p.amount);
    for (const b of payload.oldBorrowers) oldSplitMap.set(b.name, (oldSplitMap.get(b.name) || 0) - b.amount);
    const oldSplitDetails = Array.from(oldSplitMap.entries()).map(([name, delta]) => ({ name, delta: delta.toString() }));

    const expenseHashKey = `${tabKey}:expenses_hash`;
    const expenseZsetKey = `${tabKey}:expenses_zset`;
    const membersKey = `${tabKey}:members`;

    const result = await redis.eval(
      LUA_EDIT_EXPENSE,
      [expenseHashKey, expenseZsetKey, membersKey],
      [
        expenseId,
        JSON.stringify(expenseRecord),
        JSON.stringify(newSplitDetails),
        JSON.stringify(oldSplitDetails),
        serverSyncedAt.toString()
      ]
    ) as [number, string];

    if (result[0] === 0) {
       return NextResponse.json({ success: false, error: result[1] }, { status: 400 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Edit Expense Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, expenseId: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id, expenseId } = await params;
    const body = await req.json();
    
    const parsed = deleteExpenseSchema.safeParse(body);
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
    const tombstone = {
       expenseId,
       deletedAt: serverSyncedAt,
       deletedBy: payload.deletedBy
    };
    
    const oldSplitMap = new Map<string, number>();
    for (const p of payload.oldPayers) oldSplitMap.set(p.name, (oldSplitMap.get(p.name) || 0) + p.amount);
    for (const b of payload.oldBorrowers) oldSplitMap.set(b.name, (oldSplitMap.get(b.name) || 0) - b.amount);
    const oldSplitDetails = Array.from(oldSplitMap.entries()).map(([name, delta]) => ({ name, delta: delta.toString() }));

    const expenseHashKey = `${tabKey}:expenses_hash`;
    const membersKey = `${tabKey}:members`;

    const result = await redis.eval(
      LUA_DELETE_EXPENSE,
      [expenseHashKey, membersKey],
      [
        expenseId,
        JSON.stringify(oldSplitDetails),
        JSON.stringify(tombstone)
      ]
    ) as [number, string];

    if (result[0] === 0) {
       if (result[1] === "cannotDeleteSettlement") return NextResponse.json({ success: false, error: result[1] }, { status: 409 });
       return NextResponse.json({ success: false, error: result[1] }, { status: 400 });
    }
    
    // if alreadyDeleted (1, "alreadyDeleted"), we return success anyway.
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Delete Expense Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
