import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getUserIdFromToken } from '@/lib/auth';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const userId = searchParams.get('userId');

  if (!wallet && !userId) {
    return NextResponse.json({ error: 'Wallet address or userId required' }, { status: 400 });
  }

  try {
    let raw: any = null;
    if (wallet) {
      raw = await redis.get(`user:${wallet.toLowerCase()}`);
    }
    if (!raw && userId) {
      raw = await redis.get(`user:${userId}`);
    }
    let profile: any = null;
    if (raw) {
      profile = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
    return NextResponse.json(profile || null);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const userId = await getUserIdFromToken(authHeader);

    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { wallet, name, avatarColorIndex, oldName, buddySettings } = body;

    if (!wallet && !userId) {
      return NextResponse.json({ error: 'Wallet address or userId required' }, { status: 400 });
    }

    const key = wallet ? `user:${wallet.toLowerCase()}` : `user:${userId}`;
    let rawExisting: any = null;
    if (wallet) {
      rawExisting = await redis.get(`user:${wallet.toLowerCase()}`);
    }
    if (!rawExisting && userId) {
      rawExisting = await redis.get(`user:${userId}`);
    }
    let existingProfile: any = null;
    if (rawExisting) {
      existingProfile = typeof rawExisting === 'string' ? JSON.parse(rawExisting) : rawExisting;
    }

    const profileName = name ? name.trim() : (existingProfile?.name || "");
    if (!profileName && !existingProfile) {
      return NextResponse.json({ error: 'Name required for initial profile' }, { status: 400 });
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    // If profile exists and name is changed, check rate limit
    if (name && existingProfile && existingProfile.name && existingProfile.lastUpdated) {
      const isNameChanging = existingProfile.name.trim().toLowerCase() !== name.trim().toLowerCase();
      if (isNameChanging) {
        const timeSinceLastUpdate = now - existingProfile.lastUpdated;
        if (timeSinceLastUpdate < THIRTY_DAYS) {
          const daysLeft = Math.ceil((THIRTY_DAYS - timeSinceLastUpdate) / (1000 * 60 * 60 * 24));
          return NextResponse.json(
            { error: `You can only change your name once every 30 days. Please wait ${daysLeft} days.` },
            { status: 429 }
          );
        }
      }
    }

    const newProfile = {
      name: profileName,
      avatarColorIndex: typeof avatarColorIndex === 'number' ? avatarColorIndex : (existingProfile?.avatarColorIndex ?? 0),
      buddySettings: buddySettings !== undefined ? buddySettings : (existingProfile?.buddySettings || undefined),
      lastUpdated: name && existingProfile && existingProfile.name !== name.trim() ? now : (existingProfile?.lastUpdated || now),
    };

    if (wallet) {
      await redis.set(`user:${wallet.toLowerCase()}`, JSON.stringify(newProfile));
    }
    if (userId) {
      await redis.set(`user:${userId}`, JSON.stringify({ ...newProfile, wallet: wallet || "" }));
    }

    // Cascade member balance and identity migration in testnet tabs
    if (oldName && oldName.trim() && oldName.trim().toLowerCase() !== name.trim().toLowerCase()) {
      try {
        const authHeader = request.headers.get("Authorization");
        const userId = authHeader ? await getUserIdFromToken(authHeader) : null;

        const userTabKeys = [
          `meshtab:testnet:user:${wallet.toLowerCase()}:tabs`,
          userId ? `meshtab:testnet:user:${userId}:tabs` : null
        ].filter(Boolean) as string[];

        const allTabIdSets = await Promise.all(userTabKeys.map(k => redis.smembers(k)));
        const tabIds = Array.from(new Set(allTabIdSets.flat().filter(Boolean))) as string[];

        for (const tabId of tabIds) {
          const tabKey = `meshtab:testnet:tab:${tabId}`;
          const membersKey = `${tabKey}:members`;
          const walletsKey = `${tabKey}:member_wallets`;

          const oldBalance = await redis.hget(membersKey, oldName.trim());
          if (oldBalance !== null && oldBalance !== undefined) {
            const multi = redis.multi();
            multi.hset(membersKey, { [name.trim()]: String(oldBalance) });
            multi.hdel(membersKey, oldName.trim());
            multi.hset(walletsKey, { [name.trim()]: wallet });
            multi.hdel(walletsKey, oldName.trim());

            const rawTab = await redis.get(tabKey);
            if (rawTab) {
              try {
                const tabData = typeof rawTab === "string" ? JSON.parse(rawTab) : rawTab;
                if (tabData.creator && tabData.creator.toLowerCase() === oldName.trim().toLowerCase()) {
                  tabData.creator = name.trim();
                  multi.set(tabKey, JSON.stringify(tabData));
                }
              } catch {}
            }
            await multi.exec();
          }
        }
      } catch (cascadeErr) {
        console.error("Failed to cascade member rename in Redis:", cascadeErr);
      }
    }

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
