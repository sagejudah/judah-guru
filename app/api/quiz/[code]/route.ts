import { NextResponse } from 'next/server';
import { getRedis, ROOM_TTL_SECONDS } from '@/lib/redis';

const MAX_BODY_BYTES = 20000;

function roomKey(code: string) {
  return `quiz:room:${code.toUpperCase()}`;
}

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const redis = await getRedis();
  const raw = await redis.get(roomKey(params.code || ''));
  if (!raw) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return new NextResponse(raw, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  }
  try {
    JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const redis = await getRedis();
  const key = roomKey(params.code || '');
  const exists = await redis.exists(key);
  if (!exists) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // Refresh the TTL on every update so an active game never expires mid-play.
  await redis.set(key, text, { EX: ROOM_TTL_SECONDS });
  return NextResponse.json({ ok: true });
}
