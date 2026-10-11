import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";
import { getUserIdFromToken } from "../../../../lib/auth";
import { normalizeBackendMode } from "@/lib/mode";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mode = normalizeBackendMode(req.nextUrl.searchParams.get("mode"));

    const authHeader = req.headers.get("Authorization");
    const walletAddress = await getUserIdFromToken(authHeader);
    const isAuthenticated = !!walletAddress;
    
    if (!isAuthenticated || !walletAddress) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const tabKey = `meshtab:${mode}:tab:${id}`;

    const tabRaw = await redis.get(tabKey);
    let tabData: any = null;
    try {
      tabData = typeof tabRaw === "string" ? JSON.parse(tabRaw) : tabRaw;
    } catch {}

    const isMember = await redis.sismember(`${tabKey}:authorized_users`, walletAddress);
    const isCreator = Boolean(
      tabData && (
        tabData.creatorId === walletAddress || 
        (tabData.creatorWallet && tabData.creatorWallet.toLowerCase() === walletAddress.toLowerCase())
      )
    );

    if (!isMember && !isCreator) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // Read all authorized users before wiping the set so we can remove tab from their sets
    const authorizedUsers = (await redis.smembers(`${tabKey}:authorized_users`)) || [];

    const multi = redis.multi();
    // Remove tabId from all authorized users' tab sets
    if (Array.isArray(authorizedUsers)) {
      for (const u of authorizedUsers) {
        if (u) {
          multi.srem(`meshtab:${mode}:user:${u}:tabs`, id);
        }
      }
    }
    multi.srem(`meshtab:${mode}:user:${walletAddress}:tabs`, id);

    multi.del(tabKey);
    multi.del(`${tabKey}:members`);
    multi.del(`${tabKey}:member_wallets`);
    multi.del(`${tabKey}:expenses`);
    multi.del(`${tabKey}:expenses_hash`);
    multi.del(`${tabKey}:expenses_zset`);
    multi.del(`${tabKey}:authorized_users`);

    await multi.exec();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
