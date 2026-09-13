import { NextResponse } from 'next/server';
import { getRedis, ROOM_TTL_SECONDS } from '@/lib/redis';

const MAX_BODY_BYTES = 5000;

function key(code: string) {
  return `quiz:battle:${(code || '').toUpperCase()}`;
}

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const redis = await getRedis();
  const all = await redis.hGetAll(key(params.code));
  if (!all || !all.__meta) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const meta = JSON.parse(all.__meta);
  const players: Record<string, unknown> = {};
  for (const field of Object.keys(all)) {
    if (field === '__meta') continue;
    try {
      players[field] = JSON.parse(all[field]);
    } catch {
      /* skip malformed field */
    }
  }
  return NextResponse.json({ meta, players });
}

// A device calls this after every answer to upsert only its own field —
// joining and updating are the same operation (first call creates it).
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  let body: { name?: string; score?: number; attempts?: number; currentIndex?: number };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const name = (body.name || '').toString().trim().slice(0, 30);
  if (!name) return NextResponse.json({ error: 'missing name' }, { status: 400 });

  const redis = await getRedis();
  const k = key(params.code);
  const exists = await redis.exists(k);
  if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await redis.hSet(k, name, JSON.stringify({
    score: body.score || 0,
    attempts: body.attempts || 0,
    currentIndex: body.currentIndex || 0,
    updatedAt: Date.now(),
  }));
  await redis.expire(k, ROOM_TTL_SECONDS);
  return NextResponse.json({ ok: true });
}
