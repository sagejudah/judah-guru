import { NextResponse } from 'next/server';
import { getRedis, ROOM_TTL_SECONDS } from '@/lib/redis';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(len = 4) {
  let code = '';
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

const MAX_BODY_BYTES = 40000;

// Each room is a single Redis hash: field "__meta" holds the shared question
// set + round count, every other field is one player's own progress. Each
// device only ever writes its own field, so devices never clobber each other.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  let body: { questions?: unknown[]; rounds?: number; hostName?: string };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const hostName = (body.hostName || '').toString().trim().slice(0, 30);
  if (!hostName || !Array.isArray(body.questions) || !body.questions.length) {
    return NextResponse.json({ error: 'missing hostName or questions' }, { status: 400 });
  }

  const redis = await getRedis();
  let code = '';
  for (let attempt = 0; attempt < 8; attempt++) {
    code = generateCode();
    const exists = await redis.exists(`quiz:battle:${code}`);
    if (!exists) break;
  }
  const key = `quiz:battle:${code}`;
  await redis.hSet(key, '__meta', JSON.stringify({ questions: body.questions, rounds: body.rounds || body.questions.length, createdAt: Date.now() }));
  await redis.hSet(key, hostName, JSON.stringify({ score: 0, attempts: 0, currentIndex: 0, updatedAt: Date.now() }));
  await redis.expire(key, ROOM_TTL_SECONDS);
  return NextResponse.json({ code });
}
