import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    const profile = await redis.get(`user:${wallet.toLowerCase()}`);
    return NextResponse.json(profile || null);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wallet, name, avatarColorIndex } = body;

    if (!wallet || !name) {
      return NextResponse.json({ error: 'Wallet and name required' }, { status: 400 });
    }

    const key = `user:${wallet.toLowerCase()}`;
    const existingProfile: any = await redis.get(key);

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    // If profile exists, check rate limit
    if (existingProfile && existingProfile.lastUpdated) {
      const timeSinceLastUpdate = now - existingProfile.lastUpdated;
      if (timeSinceLastUpdate < THIRTY_DAYS) {
        // If the name is actually different, reject it
        if (existingProfile.name !== name.trim()) {
          const daysLeft = Math.ceil((THIRTY_DAYS - timeSinceLastUpdate) / (1000 * 60 * 60 * 24));
          return NextResponse.json(
            { error: `You can only change your name once every 30 days. Please wait ${daysLeft} days.` },
            { status: 429 }
          );
        }
        // If they are just changing their avatar color, we allow it to bypass the 30-day limit for better UX
      }
    }

    const newProfile = {
      name: name.trim(),
      avatarColorIndex: typeof avatarColorIndex === 'number' ? avatarColorIndex : 0,
      lastUpdated: now,
    };

    await redis.set(key, JSON.stringify(newProfile));

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
