import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { getUserIdFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const remindSchema = z.object({
  mode: z.enum(["clean", "demo", "testnet"]).default("clean"),
  targetUser: z.string().max(50).optional(),
  senderName: z.string().max(50).default("A member")
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    const userId = await getUserIdFromToken(authHeader);

    if (!userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = remindSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const { mode, targetUser, senderName } = parsed.data;
    const tabKey = `meshtab:${mode}:tab:${id}`;

    // Verify caller is an authorized member of the tab
    const isMember = await redis.sismember(`${tabKey}:authorized_users`, userId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // Read tab metadata for tab name
    const rawTab = await redis.get(tabKey);
    let tabData: any = null;
    try {
      tabData = typeof rawTab === "string" ? JSON.parse(rawTab) : rawTab;
    } catch {}
    const tabName = tabData?.name || "Shared Group";

    // Read members and their balances
    const membersMap = ((await redis.hgetall(`${tabKey}:members`)) || {}) as Record<string, string>;
    
    // Identify debtors to ping
    const debtors: { name: string; balanceCents: number }[] = [];
    Object.entries(membersMap).forEach(([name, balStr]) => {
      const balance = parseFloat(balStr);
      // In MeshTab, negative balance means debtor (owes money)
      if (balance < 0 && name.toLowerCase() !== senderName.toLowerCase()) {
        debtors.push({ name, balanceCents: Math.round(balance) });
      }
    });

    let targetsToNotify = debtors;
    if (targetUser && targetUser.toLowerCase() !== "all") {
      const specific = debtors.find(d => d.name.toLowerCase() === targetUser.toLowerCase());
      targetsToNotify = specific ? [specific] : [{ name: targetUser, balanceCents: 0 }];
    }

    if (targetsToNotify.length === 0) {
      return NextResponse.json({ success: true, message: "No debtors to remind", count: 0 });
    }

    const now = Date.now();
    const multi = redis.multi();

    for (const debtor of targetsToNotify) {
      const formattedAmount = debtor.balanceCents !== 0 
        ? `$${(Math.abs(debtor.balanceCents) / 100).toFixed(2)}` 
        : "their balance";

      const notifActivity = JSON.stringify({
        id: `notif-ping-${id}-${debtor.name.toLowerCase().replace(/\s+/g, "_")}-${now}`,
        type: "payment_request",
        title: "Payment Reminder",
        desc: `${senderName} sent you a reminder to settle ${formattedAmount} on "${tabName}".`,
        actor: senderName,
        targetUser: debtor.name,
        tabId: id,
        tabName,
        timestamp: now,
        link: `/tab/${id}`
      });

      multi.lpush(`${tabKey}:activity`, notifActivity);
    }

    multi.ltrim(`${tabKey}:activity`, 0, 49);
    multi.expire(`${tabKey}:activity`, 2592000);
    await multi.exec();

    return NextResponse.json({ 
      success: true, 
      count: targetsToNotify.length,
      targets: targetsToNotify.map(t => t.name)
    });

  } catch (error) {
    console.error("Remind Debtors Error:", error);
    return NextResponse.json({ success: false, error: "DATABASE_UNAVAILABLE" }, { status: 500 });
  }
}
