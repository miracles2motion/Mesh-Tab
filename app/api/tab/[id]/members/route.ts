import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";
import { LUA_REMOVE_MEMBER } from "@/lib/redis-scripts";
import { backendModeSchema } from "@/lib/mode";

const memberSchema = z.object({
  mode: backendModeSchema,
  action: z.enum(["add", "remove"]),
  name: z.string().max(50),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const userId = await getUserIdFromToken(authHeader);
    
    if (!userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    
    const parsed = memberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const { mode, action, name, walletAddress } = parsed.data;
    const tabKey = `meshtab:${mode}:tab:${id}`;

    const isMember = await redis.sismember(`${tabKey}:authorized_users`, userId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const membersKey = `${tabKey}:members`;

    if (action === "add") {
      // HSETNX is idempotent
      await redis.hsetnx(membersKey, name, 0);
      if (walletAddress) {
        await redis.hset(`${tabKey}:member_wallets`, { [name]: walletAddress });
      }
    } else if (action === "remove") {
      const existingMemberWallet = (await redis.hget(`${tabKey}:member_wallets`, name)) as string | null;
      const targetWallet = walletAddress || existingMemberWallet;

      const result = await redis.eval(
        LUA_REMOVE_MEMBER,
        [membersKey],
        [name]
      ) as [number, string];

      if (result[0] === 0) {
        return NextResponse.json({ success: false, error: result[1] }, { status: 400 });
      }

      await redis.hdel(`${tabKey}:member_wallets`, name);

      if (targetWallet) {
        await Promise.all([
          redis.srem(`${tabKey}:authorized_users`, targetWallet),
          redis.srem(`meshtab:${mode}:user:${targetWallet}:tabs`, id)
        ]);
      }
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Member Action Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
